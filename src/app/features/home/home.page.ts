import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  filterSegment: string = 'all';
  
  demoPosts = [
    {
      id: '1',
      title: 'Bitcoin Breakout Analysis',
      ticker: 'BTC',
      assetType: 'crypto',
      recommendation: 'LONG',
      description: 'Strong bullish momentum with RSI confirming uptrend. Breaking key resistance at $45,000.',
      entry: 45000,
      target: 52000,
      stop: 42000,
      riskRewardRatio: 2.3,
      confidenceLevel: 8,
      views: 1234
    },
    {
      id: '2',
      title: 'Tesla Correction Setup',
      ticker: 'TSLA',
      assetType: 'stock',
      recommendation: 'SHORT',
      description: 'Overbought conditions on daily chart. Look for pullback to $220 support.',
      entry: 245,
      target: 220,
      stop: 255,
      riskRewardRatio: 2.5,
      confidenceLevel: 7,
      views: 892
    },
    {
      id: '3',
      title: 'Ethereum Layer 2 Momentum',
      ticker: 'ETH',
      assetType: 'crypto',
      recommendation: 'LONG',
      description: 'Accumulation phase complete. Expecting breakout above $2,800.',
      entry: 2750,
      target: 3200,
      stop: 2600,
      riskRewardRatio: 3.0,
      confidenceLevel: 9,
      views: 2103
    }
  ];

  constructor() {}

  ngOnInit() {
    console.log('Home page initialized');
  }

  onFilterChange() {
    console.log('Filter changed to:', this.filterSegment);
    // TODO: Implement filtering logic
  }

  handleRefresh(event: any) {
    setTimeout(() => {
      console.log('Refreshed feed');
      event.target.complete();
    }, 1000);
  }
}
