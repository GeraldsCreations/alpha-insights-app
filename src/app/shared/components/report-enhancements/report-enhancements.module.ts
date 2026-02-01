import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

// Components
import { ExecutiveSummaryComponent } from './executive-summary/executive-summary.component';
import { VerdictTimelineComponent } from './verdict-timeline/verdict-timeline.component';
import { TradingViewChartComponent } from './tradingview-chart/tradingview-chart.component';
import { PriceLevelsComponent } from './price-levels/price-levels.component';

// Import standalone pipe
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@NgModule({
  declarations: [
    ExecutiveSummaryComponent,
    VerdictTimelineComponent,
    TradingViewChartComponent,
    PriceLevelsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    SafeUrlPipe
  ],
  exports: [
    ExecutiveSummaryComponent,
    VerdictTimelineComponent,
    TradingViewChartComponent,
    PriceLevelsComponent,
    SafeUrlPipe
  ]
})
export class ReportEnhancementsModule { }
