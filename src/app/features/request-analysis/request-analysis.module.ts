import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RequestAnalysisPageRoutingModule } from './request-analysis-routing.module';
import { RequestAnalysisPage } from './request-analysis.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RequestAnalysisPageRoutingModule,
    RequestAnalysisPage
  ]
})
export class RequestAnalysisPageModule {}
