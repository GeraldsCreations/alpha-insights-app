import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReportProgressPageRoutingModule } from './report-progress-routing.module';
import { ReportProgressPage } from './report-progress.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReportProgressPageRoutingModule
  ],
  declarations: [ReportProgressPage]
})
export class ReportProgressPageModule {}
