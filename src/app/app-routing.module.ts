import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AuthenticatedLayoutComponent } from './layouts/authenticated-layout/authenticated-layout.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./features/auth/register/register.module').then( m => m.RegisterPageModule)
  },
  // Authenticated Layout - All protected routes are children
  {
    path: '',
    component: AuthenticatedLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.module').then( m => m.HomePageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.module').then( m => m.ProfilePageModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.module').then( m => m.SettingsPageModule)
      },
      {
        path: 'analysis/:id',
        loadChildren: () => import('./features/analysis-detail/analysis-detail.module').then( m => m.AnalysisDetailPageModule)
      },
      {
        path: 'request-analysis',
        loadChildren: () => import('./features/request-analysis/request-analysis.module').then( m => m.RequestAnalysisPageModule)
      },
      {
        path: 'report-progress/:requestId',
        loadChildren: () => import('./features/report-progress/report-progress.module').then( m => m.ReportProgressPageModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
