import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { WatchlistService } from '../../core/services/watchlist.service';

/**
 * WatchlistButtonComponent - Reusable watchlist button
 * 
 * Usage:
 * <app-watchlist-button [ticker]="post.ticker"></app-watchlist-button>
 */
@Component({
  selector: 'app-watchlist-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-button 
      fill="clear" 
      (click)="toggleWatchlist($event)"
      [disabled]="isLoading">
      <ion-icon 
        slot="icon-only" 
        [name]="isInWatchlist ? 'eye' : 'eye-outline'"
        [color]="isInWatchlist ? 'primary' : ''">
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
export class WatchlistButtonComponent implements OnInit, OnDestroy {
  @Input() ticker!: string;
  @Input() showToast = true;

  private destroy$ = new Subject<void>();
  
  isInWatchlist = false;
  isLoading = false;

  constructor(
    private watchlistService: WatchlistService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadWatchlistStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load watchlist status
   */
  loadWatchlistStatus() {
    this.watchlistService.isInWatchlist(this.ticker)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isInWatchlist => {
        this.isInWatchlist = isInWatchlist;
      });
  }

  /**
   * Toggle watchlist
   */
  async toggleWatchlist(event: Event) {
    event.stopPropagation();
    
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const newState = await this.watchlistService.toggleWatchlist(this.ticker).toPromise();
      
      if (this.showToast) {
        const message = newState 
          ? `${this.ticker} added to watchlist` 
          : `${this.ticker} removed from watchlist`;
        this.showToastMessage(message);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      if (this.showToast) {
        this.showToastMessage('Failed to update watchlist', 'danger');
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
