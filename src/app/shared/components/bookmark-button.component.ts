import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { BookmarkService } from '../../core/services/bookmark.service';

/**
 * BookmarkButtonComponent - Reusable bookmark button
 * 
 * Usage:
 * <app-bookmark-button [postId]="post.id"></app-bookmark-button>
 */
@Component({
  selector: 'app-bookmark-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-button 
      fill="clear" 
      (click)="toggleBookmark($event)"
      [disabled]="isLoading">
      <ion-icon 
        slot="icon-only" 
        [name]="isBookmarked ? 'bookmark' : 'bookmark-outline'"
        [color]="isBookmarked ? 'primary' : ''">
      </ion-icon>
    </ion-button>
  `,
  styles: [`
    ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
    }
    
    ion-icon {
      font-size: 24px;
    }
  `]
})
export class BookmarkButtonComponent implements OnInit, OnDestroy {
  @Input() postId!: string;
  @Input() showToast = true;

  private destroy$ = new Subject<void>();
  
  isBookmarked = false;
  isLoading = false;

  constructor(
    private bookmarkService: BookmarkService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadBookmarkStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load bookmark status
   */
  loadBookmarkStatus() {
    this.bookmarkService.isBookmarked(this.postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isBookmarked => {
        this.isBookmarked = isBookmarked;
      });
  }

  /**
   * Toggle bookmark
   */
  async toggleBookmark(event: Event) {
    event.stopPropagation();
    
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const newState = await this.bookmarkService.toggleBookmark(this.postId).toPromise();
      
      if (this.showToast) {
        const message = newState 
          ? 'Added to bookmarks' 
          : 'Removed from bookmarks';
        this.showToastMessage(message);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      if (this.showToast) {
        this.showToastMessage('Failed to update bookmark', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Show toast message
   */
  private async showToastMessage(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
