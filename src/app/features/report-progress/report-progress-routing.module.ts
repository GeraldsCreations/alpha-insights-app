import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ReportProgressPage } from './report-progress.page';

const routes: Routes = [
  {
    path: '',
    component: ReportProgressPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportProgressPageRoutingModule {}
