import { Component, Input, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';

declare const TradingView: any;

@Component({
  selector: 'app-tradingview-chart',
  templateUrl: './tradingview-chart.component.html',
  styleUrls: ['./tradingview-chart.component.scss'],
  standalone: false
})
export class TradingViewChartComponent implements AfterViewInit, OnDestroy {
  @Input() ticker!: string;
  @Input() entry?: number;
  @Input() target?: number;
  @Input() stop?: number;
  @Input() height: string = '400px';
  @Input() interval: string = 'D'; // D = Daily, 240 = 4H, 60 = 1H, etc.

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  private widget: any;

  ngAfterViewInit() {
    this.loadChart();
  }

  ngOnDestroy() {
    if (this.widget) {
      this.widget.remove();
    }
  }

  loadChart() {
    if (typeof TradingView === 'undefined') {
      // TradingView library not loaded, show fallback
      console.warn('TradingView library not loaded');
      return;
    }

    try {
      this.widget = new TradingView.widget({
        autosize: true,
        symbol: this.ticker,
        interval: this.interval,
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        details: true,
        hotlist: false,
        calendar: false,
        studies: [
          'RSI@tv-basicstudies',
          'MASimple@tv-basicstudies',
          'MACD@tv-basicstudies'
        ],
        container_id: this.chartContainer.nativeElement.id,
        height: this.height
      });

      // Add horizontal lines for entry, target, stop after chart loads
      if (this.widget && (this.entry || this.target || this.stop)) {
        setTimeout(() => {
          this.addTradeLevels();
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading TradingView chart:', error);
    }
  }

  addTradeLevels() {
    // Note: This would require TradingView advanced features
    // For now, we'll handle this in the price-levels component
    console.log('Trade levels:', { entry: this.entry, target: this.target, stop: this.stop });
  }

  get symbolFormatted(): string {
    // Format ticker for TradingView (e.g., NASDAQ:TSLA, BINANCE:BTCUSDT)
    return this.ticker;
  }
}
