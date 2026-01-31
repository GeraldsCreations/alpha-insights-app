import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalysisDetailPage } from './analysis-detail.page';

const routes: Routes = [
  {
    path: '',
    component: AnalysisDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalysisDetailPageRoutingModule {}
