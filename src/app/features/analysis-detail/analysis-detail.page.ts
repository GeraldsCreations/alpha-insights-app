import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalysisService } from '../../core/services/analysis.service';
import { AnalysisPost } from '../../core/models';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-analysis-detail',
  templateUrl: './analysis-detail.page.html',
  styleUrls: ['./analysis-detail.page.scss'],
  standalone: false
})
export class AnalysisDetailPage implements OnInit, OnDestroy {
  postId: string = '';
  post: AnalysisPost | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  
  // Active tab
  activeTab: string = 'overview';
  
  // Verdict data (parsed from markdown)
  verdicts: Array<{
    timeframe: string;
    verdict: 'BUY' | 'SELL' | 'HOLD' | 'UNKNOWN';
    confidence: number;
  }> = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: AnalysisService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Get post ID from route params
    this.postId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.postId) {
      this.loadPost();
    } else {
      this.errorMessage = 'Invalid post ID';
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load post from Firestore
   */
  loadPost() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.analysisService.getPostById(this.postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
          if (post) {
            this.post = post;
            this.parseVerdicts();
            this.incrementViewCount();
          } else {
            this.errorMessage = 'Post not found';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading post:', error);
          this.errorMessage = 'Failed to load analysis';
          this.isLoading = false;
          this.showToast('Failed to load analysis', 'danger');
        }
      });
  }

  /**
   * Parse verdicts from markdown content
   */
  parseVerdicts() {
    if (!this.post?.content?.verdicts) return;
    
    const verdictsText = this.post.content.verdicts;
    const timeframes = ['5-Min', '15-Min', '1-Hour', '4-Hour', 'Daily', 'Weekly', '1-Day'];
    
    this.verdicts = timeframes.map(timeframe => {
      // Look for pattern like "**5-Min:** BUY (High confidence - 80%)"
      const regex = new RegExp(`\\*\\*${timeframe}:\\*\\*\\s*(BUY|SELL|HOLD)[^\\d]*(\\d+)%`, 'i');
      const match = verdictsText.match(regex);
      
      if (match) {
        const verdict = match[1].toUpperCase();
        return {
          timeframe,
          verdict: (verdict === 'BUY' || verdict === 'SELL' || verdict === 'HOLD' ? verdict : 'UNKNOWN') as 'BUY' | 'SELL' | 'HOLD' | 'UNKNOWN',
          confidence: parseInt(match[2])
        };
      }
      
      return {
        timeframe,
        verdict: 'UNKNOWN' as const,
        confidence: 0
      };
    });
  }

  /**
   * Increment view count
   */
  private incrementViewCount() {
    if (!this.post) return;
    
    this.analysisService.incrementViews(this.post.id)
      .subscribe({
        error: (err) => console.error('Failed to increment views:', err)
      });
  }

  /**
   * Switch tab
   */
  onTabChange(tab: string) {
    this.activeTab = tab;
  }

  /**
   * Navigate back
   */
  goBack() {
    this.router.navigate(['/home']);
  }

  /**
   * View ticker details
   */
  viewTickerDetails() {
    if (!this.post) return;
    this.router.navigate(['/ticker', this.post.ticker]);
  }

  /**
   * Get verdict color
   */
  getVerdictColor(verdict: string): string {
    switch (verdict.toUpperCase()) {
      case 'BUY':
      case 'LONG':
        return 'success';
      case 'SELL':
      case 'SHORT':
        return 'danger';
      case 'HOLD':
        return 'warning';
      default:
        return 'medium';
    }
  }

  /**
   * Get confidence bar width
   */
  getConfidenceWidth(confidence: number): string {
    return `${confidence}%`;
  }

  /**
   * Get recommendation badge color
   */
  getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
      case 'LONG': return 'success';
      case 'SHORT': return 'danger';
      case 'NO_TRADE':
      case 'HOLD': return 'warning';
      default: return 'medium';
    }
  }

  /**
   * Calculate profit/loss percentages
   */
  getStopLossPercent(): number {
    if (!this.post) return 0;
    return ((this.post.entry - this.post.stop) / this.post.entry) * 100;
  }

  getTargetPercent(): number {
    if (!this.post) return 0;
    return ((this.post.target - this.post.entry) / this.post.entry) * 100;
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
