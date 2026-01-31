import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertController, ToastController } from '@ionic/angular';
import { WatchlistService } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.page.html',
  styleUrls: ['./watchlist.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class WatchlistPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  watchlist: string[] = [];
  loading = false;

  constructor(
    private watchlistService: WatchlistService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadWatchlist();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load watchlist
   */
  loadWatchlist() {
    this.loading = true;

    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (watchlist) => {
          this.watchlist = watchlist;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading watchlist:', error);
          this.showToast('Failed to load watchlist', 'danger');
          this.loading = false;
        }
      });
  }

  /**
   * Add ticker to watchlist
   */
  async addTicker() {
    const alert = await this.alertController.create({
      header: 'Add to Watchlist',
      inputs: [
        {
          name: 'ticker',
          type: 'text',
          placeholder: 'Enter ticker symbol (e.g., BTC, AAPL)',
          attributes: {
            maxlength: 10,
            style: 'text-transform: uppercase'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.ticker || data.ticker.trim() === '') {
              this.showToast('Please enter a ticker symbol', 'warning');
              return false;
            }

            try {
              await this.watchlistService.addToWatchlistWithValidation(data.ticker).toPromise();
              this.showToast(`${data.ticker.toUpperCase()} added to watchlist`);
              return true;
            } catch (error: any) {
              console.error('Error adding ticker:', error);
              const message = error.message || 'Failed to add ticker';
              this.showToast(message, 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Remove ticker from watchlist
   */
  async removeTicker(ticker: string) {
    const alert = await this.alertController.create({
      header: 'Remove from Watchlist',
      message: `Remove ${ticker} from your watchlist?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            try {
              await this.watchlistService.removeFromWatchlist(ticker).toPromise();
              this.showToast(`${ticker} removed from watchlist`);
            } catch (error) {
              console.error('Error removing ticker:', error);
              this.showToast('Failed to remove ticker', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Clear all watchlist
   */
  async clearWatchlist() {
    if (this.watchlist.length === 0) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Clear Watchlist',
      message: 'Remove all tickers from your watchlist?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear All',
          role: 'destructive',
          handler: async () => {
            try {
              await this.watchlistService.clearWatchlist().toPromise();
              this.showToast('Watchlist cleared');
            } catch (error) {
              console.error('Error clearing watchlist:', error);
              this.showToast('Failed to clear watchlist', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Handle refresh
   */
  handleRefresh(event: any) {
    this.loadWatchlist();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Show toast
   */
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
