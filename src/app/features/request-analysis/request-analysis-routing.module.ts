import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

import { RequestAnalysisPage } from './request-analysis.page';

const routes: Routes = [
  {
    path: '',
    component: RequestAnalysisPage,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RequestAnalysisPageRoutingModule {}
