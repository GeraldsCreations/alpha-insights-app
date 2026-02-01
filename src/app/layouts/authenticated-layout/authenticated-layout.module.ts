import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthenticatedLayoutComponent } from './authenticated-layout.component';

@NgModule({
  declarations: [
    AuthenticatedLayoutComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    IonicModule
  ],
  exports: [
    AuthenticatedLayoutComponent
  ]
})
export class AuthenticatedLayoutModule { }
