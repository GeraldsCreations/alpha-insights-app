import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-watchlist-button',
  template: `
    <ion-button fill="clear" size="small" (click)="toggle($event)">
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
export class WatchlistButtonComponent {
  @Input() ticker: string = '';
  @Input() showToast: boolean = true;
  
  isWatchlisted: boolean = false;
  
  toggle(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isWatchlisted = !this.isWatchlisted;
    // TODO: Implement actual watchlist service integration
  }
}
