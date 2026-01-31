import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AnalysisDetailPageRoutingModule } from './analysis-detail-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { AnalysisDetailPage } from './analysis-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalysisDetailPageRoutingModule,
    SharedModule
  ],
  declarations: [AnalysisDetailPage]
})
export class AnalysisDetailPageModule {}
