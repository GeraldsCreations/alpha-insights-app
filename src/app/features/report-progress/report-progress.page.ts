import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomReportProgressService, CustomReportProgress } from '../../core/services/custom-report-progress.service';

@Component({
  selector: 'app-report-progress',
  templateUrl: './report-progress.page.html',
  styleUrls: ['./report-progress.page.scss'],
  standalone: false
})
export class ReportProgressPage implements OnInit, OnDestroy {
  progress: CustomReportProgress | null = null;
  requestId: string = '';
  
  private progressSubscription?: Subscription;
  private autoNavigateTimeout?: any;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: CustomReportProgressService
  ) {}
  
  ngOnInit() {
    // Get request ID from route
    this.requestId = this.route.snapshot.paramMap.get('requestId') || '';
    
    if (!this.requestId) {
      console.error('No request ID provided');
      this.router.navigate(['/home']);
      return;
    }
    
    // Start monitoring progress
    this.progressSubscription = this.progressService
      .monitorProgress(this.requestId)
      .subscribe(progress => {
        this.progress = progress;
        
        // Auto-navigate when complete
        if (progress.status === 'complete' && progress.reportId) {
          this.autoNavigateToReport(progress.reportId);
        }
      });
  }
  
  ngOnDestroy() {
    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
    }
    
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
    }
  }
  
  /**
   * Auto-navigate to completed report after 2 seconds
   */
  private autoNavigateToReport(reportId: string) {
    if (this.autoNavigateTimeout) {
      return; // Already navigating
    }
    
    this.autoNavigateTimeout = setTimeout(() => {
      this.router.navigate(['/analysis-detail', reportId]);
    }, 2000);
  }
  
  /**
   * Manual navigate to report (skip auto-navigate timer)
   */
  viewReport() {
    if (this.progress?.reportId) {
      if (this.autoNavigateTimeout) {
        clearTimeout(this.autoNavigateTimeout);
      }
      this.router.navigate(['/analysis-detail', this.progress.reportId]);
    }
  }
  
  /**
   * Cancel and go back to request page
   */
  cancelAndGoBack() {
    this.router.navigate(['/request-analysis']);
  }
  
  /**
   * Go back to home
   */
  goHome() {
    this.router.navigate(['/home']);
  }
  
  /**
   * Format time remaining
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Just a moment...';
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m`;
  }
  
  /**
   * Get progress bar color
   */
  getProgressColor(): string {
    if (!this.progress) return 'primary';
    if (this.progress.status === 'failed') return 'danger';
    if (this.progress.status === 'complete') return 'success';
    return 'primary';
  }
  
  /**
   * Get status icon
   */
  getStatusIcon(): string {
    if (!this.progress) return 'hourglass-outline';
    
    switch (this.progress.status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'sync-outline';
      case 'complete':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      default:
        return 'hourglass-outline';
    }
  }
}
