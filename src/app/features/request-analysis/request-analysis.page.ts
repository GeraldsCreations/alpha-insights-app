import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { CustomRequestService, QuotaStatus } from '../../core/services/custom-request.service';
import { TickerSearchService, SearchResult } from '../../core/services/ticker-search.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-request-analysis',
  templateUrl: './request-analysis.page.html',
  styleUrls: ['./request-analysis.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class RequestAnalysisPage implements OnInit {
  ticker = '';
  assetType: 'crypto' | 'stock' | 'commodity' = 'stock';
  quotaStatus: QuotaStatus | null = null;
  loading = false;
  submitted = false;
  
  // Search functionality
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  searchLoading = false;
  private searchSubject = new Subject<string>();
  
  constructor(
    private customRequestService: CustomRequestService,
    private tickerSearchService: TickerSearchService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}
  
  ngOnInit() {
    // Don't load quota on init - only check when submitting
    this.setupSearch();
  }
  
  /**
   * Setup search with debouncing
   */
  setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          this.searchLoading = false;
          return [];
        }
        this.searchLoading = true;
        return this.tickerSearchService.searchTickers(query);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.searchLoading = false;
        this.showSearchResults = results.length > 0;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.searchLoading = false;
        this.searchResults = [];
      }
    });
  }
  
  /**
   * Handle search input
   */
  onSearchInput(event: any) {
    const query = event.target.value || '';
    this.searchQuery = query;
    
    if (query.length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      this.searchLoading = false;
      return;
    }
    
    this.searchSubject.next(query);
  }
  
  /**
   * Select a search result
   */
  selectResult(result: SearchResult) {
    this.ticker = result.symbol;
    this.assetType = result.type;
    this.searchQuery = result.symbol;
    this.showSearchResults = false;
    this.searchResults = [];
  }
  
  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.ticker = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }
  
  /**
   * Handle search bar focus
   */
  onSearchFocus() {
    if (this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
  }
  
  /**
   * Handle search bar blur (with delay to allow clicks)
   */
  onSearchBlur() {
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }
  
  /**
   * Load user's quota status
   */
  loadQuotaStatus() {
    this.customRequestService.getUserQuota().subscribe({
      next: (quota) => {
        this.quotaStatus = quota;
      },
      error: (error) => {
        console.error('Error loading quota:', error);
        this.showToast('Failed to load quota status', 'danger');
      }
    });
  }
  
  /**
   * Handle ticker input (fallback for manual entry)
   */
  onTickerInput(event: any) {
    // Auto-uppercase
    this.ticker = event.target.value.toUpperCase();
  }
  
  /**
   * Validate form
   */
  isFormValid(): boolean {
    const validation = this.customRequestService.validateTicker(this.ticker);
    return validation.valid;
  }
  
  /**
   * Get validation error message
   */
  getValidationError(): string | null {
    if (!this.ticker) {
      return null;
    }
    
    const validation = this.customRequestService.validateTicker(this.ticker);
    return validation.error || null;
  }
  
  /**
   * Submit custom request
   */
  async submitRequest() {
    if (!this.isFormValid()) {
      return;
    }
    
    // Validate ticker format
    const validation = this.customRequestService.validateTicker(this.ticker);
    if (!validation.valid) {
      this.showToast(validation.error || 'Invalid ticker', 'danger');
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Submitting request...',
      spinner: 'crescent'
    });
    await loading.present();
    
    this.loading = true;
    
    try {
      // Submit custom request (quota check happens in Cloud Function)
      const result = await this.customRequestService
        .submitCustomRequest(this.ticker, this.assetType)
        .toPromise();
      
      await loading.dismiss();
      
      if (result && result.success) {
        this.submitted = true;
        
        // Navigate to progress page
        this.router.navigate(['/report-progress', result.requestId]);
        
        // Reset form (for when user comes back)
        setTimeout(() => {
          this.ticker = '';
          this.searchQuery = '';
          this.submitted = false;
        }, 1000);
      }
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting request:', error);
      
      let message = 'Failed to submit request. Please try again.';
      
      if (error.code === 'already-exists') {
        message = 'You already have a pending request for this ticker.';
      } else if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
        message = 'No reports remaining. Upgrade to Premium for more!';
        this.showUpgradePrompt();
        return;
      }
      
      this.showToast(message, 'danger');
      
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Show upgrade prompt
   */
  async showUpgradePrompt() {
    const toast = await this.toastController.create({
      message: 'No reports remaining. Upgrade to Premium for more!',
      duration: 5000,
      color: 'warning',
      position: 'top',
      buttons: [
        {
          text: 'Upgrade',
          handler: () => {
            // TODO: Navigate to upgrade page (manual for now)
            this.showToast('Contact support to upgrade to Premium', 'primary');
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    
    await toast.present();
  }
  
  /**
   * Show toast message
   */
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    
    await toast.present();
  }
  
  /**
   * Navigate to request history
   */
  viewHistory() {
    this.router.navigate(['/profile/custom-requests']);
  }
}
