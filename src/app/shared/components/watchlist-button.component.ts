import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-watchlist-button',
  template: `
    <ion-button fill="clear" size="small" (click)="toggle($event)" [disabled]="loading">
      <ion-icon 
        slot="icon-only" 
        [name]="isWatchlisted ? 'star' : 'star-outline'" 
        [color]="isWatchlisted ? 'warning' : 'medium'">
      </ion-icon>
    </ion-button>
  `,
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class WatchlistButtonComponent implements OnInit, OnDestroy {
  @Input() ticker: string = '';
  @Input() showToast: boolean = true;
  
  isWatchlisted: boolean = false;
  loading: boolean = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(private watchlistService: WatchlistService) {}
  
  ngOnInit() {
    if (this.ticker) {
      // Subscribe to watchlist changes for this ticker
      this.watchlistService.isWatchlisted(this.ticker)
        .pipe(takeUntil(this.destroy$))
        .subscribe(isWatchlisted => {
          this.isWatchlisted = isWatchlisted;
        });
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  async toggle(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.ticker || this.loading) {
      return;
    }
    
    this.loading = true;
    
    try {
      const newState = await this.watchlistService.toggleWatchlist(this.ticker, this.showToast);
      this.isWatchlisted = newState;
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    } finally {
      this.loading = false;
    }
  }
}
