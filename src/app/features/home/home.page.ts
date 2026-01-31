import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular';
import { AnalysisService } from '../../core/services/analysis.service';
import { AnalysisPost } from '../../core/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  filterSegment: string = 'all';
  posts: AnalysisPost[] = [];
  isLoading: boolean = true;
  isOffline: boolean = false;
  errorMessage: string = '';
  
  private postsSubscription?: Subscription;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;

  constructor(
    private analysisService: AnalysisService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    console.log('Home page initialized');
    this.loadPosts();
    this.setupNetworkListener();
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.postsSubscription) {
      this.postsSubscription.unsubscribe();
    }
  }

  /**
   * Load posts from Firestore
   */
  loadPosts() {
    this.isLoading = true;
    this.errorMessage = '';

    // Unsubscribe from previous subscription if exists
    if (this.postsSubscription) {
      this.postsSubscription.unsubscribe();
    }

    // Build filters based on current segment
    const filters: any = { limit: 50 };
    
    if (this.filterSegment !== 'all') {
      filters.assetType = this.filterSegment;
    }

    // Subscribe to real-time Firestore updates
    this.postsSubscription = this.analysisService.getAnalysisFeed(filters).subscribe({
      next: (posts) => {
        this.posts = posts;
        this.isLoading = false;
        this.isOffline = false;
        this.retryCount = 0;

        if (posts.length === 0) {
          this.errorMessage = 'No posts found. Be the first to share an analysis!';
        }
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.isLoading = false;
        this.handleLoadError(error);
      }
    });
  }

  /**
   * Handle errors when loading posts
   */
  private handleLoadError(error: any) {
    // Check if it's a network error
    if (error.message?.includes('network') || 
        error.message?.includes('offline') || 
        error.code === 'unavailable') {
      this.isOffline = true;
      this.errorMessage = 'You appear to be offline. Please check your connection.';
      this.showNetworkErrorToast();
    } else if (error.code === 'permission-denied') {
      this.errorMessage = 'Permission denied. Please check your Firebase security rules.';
      this.showToast('Access denied. Please contact support.', 'danger');
    } else if (error.code === 'unauthenticated') {
      this.errorMessage = 'Authentication required. Please log in again.';
      this.showToast('Session expired. Please log in again.', 'warning');
    } else {
      this.errorMessage = 'Failed to load posts. Please try again.';
      
      // Retry logic for transient errors
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryLoadWithBackoff();
      } else {
        this.showErrorAlert();
      }
    }
  }

  /**
   * Retry loading posts with exponential backoff
   */
  private retryLoadWithBackoff() {
    this.retryCount++;
    const backoffTime = Math.pow(2, this.retryCount) * 1000; // 2s, 4s, 8s
    
    console.log(`Retrying in ${backoffTime}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
    
    setTimeout(() => {
      this.loadPosts();
    }, backoffTime);
  }

  /**
   * Show error alert with retry option
   */
  private async showErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Connection Error',
      message: 'Unable to load posts. Please check your internet connection and try again.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Retry',
          handler: () => {
            this.retryCount = 0;
            this.loadPosts();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener() {
    window.addEventListener('online', () => {
      console.log('Network status: online');
      this.isOffline = false;
      if (this.posts.length === 0) {
        this.showToast('Back online! Refreshing...', 'success');
        this.loadPosts();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network status: offline');
      this.isOffline = true;
      this.showToast('You are offline. Some features may be limited.', 'warning', 4000);
    });
  }

  /**
   * Handle filter segment change
   */
  onFilterChange() {
    console.log('Filter changed to:', this.filterSegment);
    this.loadPosts();
  }

  /**
   * Handle pull-to-refresh
   */
  handleRefresh(event: any) {
    console.log('Manual refresh triggered');
    this.retryCount = 0;
    this.loadPosts();
    
    // Complete the refresh after a short delay
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Show toast notification
   */
  private async showToast(
    message: string, 
    color: 'success' | 'danger' | 'warning' = 'primary',
    duration: number = 3000
  ) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  /**
   * Show network error toast
   */
  private async showNetworkErrorToast() {
    const toast = await this.toastController.create({
      message: '🔌 No internet connection. Showing cached data.',
      duration: 4000,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: 'Retry',
          handler: () => {
            this.retryCount = 0;
            this.loadPosts();
          }
        }
      ]
    });
    await toast.present();
  }

  /**
   * Get badge color for recommendation
   */
  getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
      case 'LONG': return 'success';
      case 'SHORT': return 'danger';
      case 'HOLD': return 'warning';
      default: return 'medium';
    }
  }

  /**
   * Get icon for asset type
   */
  getAssetIcon(assetType: string): string {
    switch (assetType) {
      case 'stock': return 'bar-chart';
      case 'crypto': return 'logo-bitcoin';
      case 'forex': return 'cash';
      case 'commodity': return 'diamond';
      default: return 'trending-up';
    }
  }
}
