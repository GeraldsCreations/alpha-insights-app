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
    console.log('[AnalysisDetail] Component initialized - FIX v2.0');
    
    // Subscribe to route params to handle navigation between analyses
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const newId = params.get('id') || '';
        console.log('[AnalysisDetail] Route param changed:', { oldId: this.postId, newId });
        
        this.postId = newId;
        
        if (this.postId) {
          this.loadPost();
        } else {
          this.errorMessage = 'Invalid post ID';
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load post from Firestore
   */
  loadPost() {
    console.log('[AnalysisDetail] Loading post:', this.postId);
    this.isLoading = true;
    this.errorMessage = '';
    
    this.analysisService.getPostById(this.postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
          console.log('[AnalysisDetail] Post loaded:', post ? post.ticker : 'null');
          if (post) {
            this.post = post;
            this.parseVerdicts();
            this.incrementViewCount();
          } else {
            console.error('[AnalysisDetail] Post not found in Firestore. Document ID:', this.postId);
            this.errorMessage = `Analysis not found (ID: ${this.postId}). Please check the document exists in the research_reports collection.`;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[AnalysisDetail] Firestore error:', error);
          console.error('[AnalysisDetail] Error code:', error.code);
          console.error('[AnalysisDetail] Error message:', error.message);
          
          if (error.code === 'permission-denied') {
            this.errorMessage = 'Permission denied. Please check Firestore security rules.';
          } else if (error.code === 'not-found') {
            this.errorMessage = `Document not found: ${this.postId}`;
          } else {
            this.errorMessage = `Failed to load analysis: ${error.message || 'Unknown error'}`;
          }
          
          this.isLoading = false;
          this.showToast(this.errorMessage, 'danger');
        }
      });
  }

  /**
   * Parse verdicts from markdown content
   */
  parseVerdicts() {
    if (!this.post?.content?.verdicts) {
      console.warn('No verdicts field found in post.content');
      return;
    }
    
    const verdictsText = this.post.content.verdicts;
    console.log('Parsing verdicts from:', verdictsText);
    
    const timeframes = ['5-Min', '15-Min', '1-Hour', '4-Hour', 'Daily', 'Weekly'];
    
    this.verdicts = timeframes.map(timeframe => {
      // Try multiple regex patterns to be more flexible
      
      // Pattern 1: **5-Min:** BUY (High confidence - 80%)
      let regex = new RegExp(`\\*\\*${timeframe.replace('-', '[-\\s]?')}:\\*\\*\\s*(BUY|SELL|HOLD)[^\\d]*(\\d+)%`, 'i');
      let match = verdictsText.match(regex);
      
      // Pattern 2: 5-Min: BUY (80%)
      if (!match) {
        regex = new RegExp(`${timeframe.replace('-', '[-\\s]?')}:\\s*(BUY|SELL|HOLD)[^\\d]*(\\d+)%`, 'i');
        match = verdictsText.match(regex);
      }
      
      // Pattern 3: 5 Min BUY 80%
      if (!match) {
        regex = new RegExp(`${timeframe.replace('-', '\\s')}\\s*(BUY|SELL|HOLD)[^\\d]*(\\d+)%`, 'i');
        match = verdictsText.match(regex);
      }
      
      // Pattern 4: Just look for the verdict word near the timeframe
      if (!match) {
        const tfRegex = new RegExp(`${timeframe.replace('-', '[-\\s]?')}[^a-z]*(BUY|SELL|HOLD)`, 'i');
        const tfMatch = verdictsText.match(tfRegex);
        if (tfMatch) {
          // Try to find confidence near this verdict
          const confRegex = /(\d+)%/;
          const nearbyText = verdictsText.substring(Math.max(0, verdictsText.indexOf(tfMatch[0]) - 50), 
                                                     verdictsText.indexOf(tfMatch[0]) + 100);
          const confMatch = nearbyText.match(confRegex);
          
          return {
            timeframe,
            verdict: tfMatch[1].toUpperCase() as 'BUY' | 'SELL' | 'HOLD',
            confidence: confMatch ? parseInt(confMatch[1]) : 70 // Default confidence if not found
          };
        }
      }
      
      if (match) {
        const verdict = match[1].toUpperCase();
        return {
          timeframe,
          verdict: (verdict === 'BUY' || verdict === 'SELL' || verdict === 'HOLD' ? verdict : 'UNKNOWN') as 'BUY' | 'SELL' | 'HOLD' | 'UNKNOWN',
          confidence: parseInt(match[2])
        };
      }
      
      console.warn(`No verdict pattern found for timeframe: ${timeframe}`);
      return {
        timeframe,
        verdict: 'UNKNOWN' as const,
        confidence: 0
      };
    });
    
    console.log('Parsed verdicts:', this.verdicts);
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
