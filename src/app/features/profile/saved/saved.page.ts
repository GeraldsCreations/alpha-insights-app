import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { BookmarkService } from '../../../core/services/bookmark.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AnalysisPost } from '../../../core/models';

@Component({
  selector: 'app-saved',
  templateUrl: './saved.page.html',
  styleUrls: ['./saved.page.scss'],
})
export class SavedPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  savedPosts: AnalysisPost[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private bookmarkService: BookmarkService,
    private analysisService: AnalysisService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSavedPosts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load saved posts
   */
  loadSavedPosts() {
    this.loading = true;
    this.error = null;

    this.bookmarkService.getBookmarkedPostIds()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(postIds => {
          if (postIds.length === 0) {
            return [];
          }
          // Fetch full posts for bookmarked IDs
          return this.analysisService.getPostsByIds(postIds);
        })
      )
      .subscribe({
        next: (posts) => {
          this.savedPosts = posts;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading saved posts:', error);
          this.error = 'Failed to load saved posts';
          this.loading = false;
        }
      });
  }

  /**
   * Handle refresh
   */
  handleRefresh(event: any) {
    this.loadSavedPosts();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Navigate to post detail
   */
  viewPost(post: AnalysisPost) {
    this.router.navigate(['/analysis', post.id]);
  }

  /**
   * Get recommendation color
   */
  getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
      case 'LONG':
        return 'success';
      case 'SHORT':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Format timestamp
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }
}
