import { Component, Input, OnInit } from '@angular/core';

export interface PriceLevel {
  price: number;
  type: 'entry' | 'target' | 'stop' | 'support' | 'resistance';
  label: string;
  description?: string;
}

@Component({
  selector: 'app-price-levels',
  templateUrl: './price-levels.component.html',
  styleUrls: ['./price-levels.component.scss'],
  standalone: false
})
export class PriceLevelsComponent implements OnInit {
  @Input() entry!: number;
  @Input() target!: number;
  @Input() stop!: number;
  @Input() ticker!: string;
  @Input() currentPrice?: number;

  levels: PriceLevel[] = [];
  maxPrice: number = 0;
  minPrice: number = 0;
  priceRange: number = 0;

  ngOnInit() {
    this.calculateLevels();
  }

  ngOnChanges() {
    this.calculateLevels();
  }

  calculateLevels() {
    // Create levels array
    this.levels = [
      { price: this.target, type: 'target', label: 'Target', description: 'Take profit level' },
      { price: this.entry, type: 'entry', label: 'Entry', description: 'Recommended entry price' },
      { price: this.stop, type: 'stop', label: 'Stop Loss', description: 'Risk management level' }
    ];

    // Add current price if available
    if (this.currentPrice) {
      this.levels.push({
        price: this.currentPrice,
        type: 'support',
        label: 'Current',
        description: 'Live market price'
      });
    }

    // Sort levels by price descending
    this.levels.sort((a, b) => b.price - a.price);

    // Calculate price range for visualization
    this.maxPrice = Math.max(this.target, this.entry, this.stop, this.currentPrice || 0);
    this.minPrice = Math.min(this.target, this.entry, this.stop, this.currentPrice || Infinity);
    this.priceRange = this.maxPrice - this.minPrice;

    // Add padding
    const padding = this.priceRange * 0.1;
    this.maxPrice += padding;
    this.minPrice -= padding;
    this.priceRange = this.maxPrice - this.minPrice;
  }

  getLevelPosition(price: number): number {
    // Return percentage position from bottom
    return ((price - this.minPrice) / this.priceRange) * 100;
  }

  getLevelColor(type: string): string {
    switch (type) {
      case 'target':
        return 'success';
      case 'entry':
        return 'primary';
      case 'stop':
        return 'danger';
      case 'support':
      case 'resistance':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getLevelIcon(type: string): string {
    switch (type) {
      case 'target':
        return 'trophy';
      case 'entry':
        return 'enter';
      case 'stop':
        return 'hand-left';
      case 'support':
        return 'trending-up';
      case 'resistance':
        return 'trending-down';
      default:
        return 'radio-button-on';
    }
  }

  get potentialGain(): number {
    return ((this.target - this.entry) / this.entry) * 100;
  }

  get potentialLoss(): number {
    return ((this.entry - this.stop) / this.entry) * 100;
  }

  get riskReward(): number {
    const risk = this.entry - this.stop;
    const reward = this.target - this.entry;
    return reward / risk;
  }

  getCurrentPricePercentage(): number {
    if (!this.currentPrice) return 0;
    return ((this.currentPrice - this.entry) / this.entry) * 100;
  }
}
