import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AnalysisDetailPageRoutingModule } from './analysis-detail-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { ReportEnhancementsModule } from '../../shared/components/report-enhancements/report-enhancements.module';

import { AnalysisDetailPage } from './analysis-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalysisDetailPageRoutingModule,
    SharedModule,
    ReportEnhancementsModule
  ],
  declarations: [AnalysisDetailPage]
})
export class AnalysisDetailPageModule {}
