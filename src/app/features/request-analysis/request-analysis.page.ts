import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { CustomRequestService, QuotaStatus } from '../../core/services/custom-request.service';

@Component({
  selector: 'app-request-analysis',
  templateUrl: './request-analysis.page.html',
  styleUrls: ['./request-analysis.page.scss']
})
export class RequestAnalysisPage implements OnInit {
  ticker = '';
  assetType: 'crypto' | 'stock' = 'stock';
  quotaStatus: QuotaStatus | null = null;
  loading = false;
  submitted = false;
  
  constructor(
    private customRequestService: CustomRequestService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}
  
  ngOnInit() {
    this.loadQuotaStatus();
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
   * Handle ticker input
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
    return validation.valid && this.quotaStatus !== null && this.quotaStatus.quotaRemaining > 0;
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
    
    // Check quota
    if (!this.quotaStatus || this.quotaStatus.quotaRemaining <= 0) {
      this.showUpgradePrompt();
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Submitting request...',
      spinner: 'crescent'
    });
    await loading.present();
    
    this.loading = true;
    
    try {
      // Check and decrement quota
      const quotaResult = await this.customRequestService
        .checkAndDecrementQuota(this.ticker)
        .toPromise();
      
      if (!quotaResult || !quotaResult.success) {
        await loading.dismiss();
        this.showToast(
          quotaResult?.message || 'No quota remaining',
          'warning'
        );
        this.showUpgradePrompt();
        return;
      }
      
      // Submit custom request
      const result = await this.customRequestService
        .submitCustomRequest(this.ticker, this.assetType)
        .toPromise();
      
      await loading.dismiss();
      
      if (result && result.success) {
        this.submitted = true;
        this.showToast(
          `${this.ticker} analysis is being prepared! We'll notify you when it's ready.`,
          'success'
        );
        
        // Reload quota
        this.loadQuotaStatus();
        
        // Reset form
        setTimeout(() => {
          this.ticker = '';
          this.submitted = false;
        }, 3000);
      }
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error submitting request:', error);
      
      let message = 'Failed to submit request. Please try again.';
      
      if (error.code === 'already-exists') {
        message = 'You already have a pending request for this ticker.';
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
