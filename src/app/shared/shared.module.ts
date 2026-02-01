import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BookmarkButtonComponent } from './components/bookmark-button.component';
import { ShareButtonComponent } from './components/share-button.component';
import { WatchlistButtonComponent } from './components/watchlist-button.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { SafeUrlPipe } from './pipes/safe-url.pipe';

/**
 * SharedModule - Contains reusable components, directives, and pipes
 */
@NgModule({
  declarations: [
    AppShellComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    BookmarkButtonComponent,
    ShareButtonComponent,
    WatchlistButtonComponent,
    SafeUrlPipe
  ],
  exports: [
    AppShellComponent,
    BookmarkButtonComponent,
    ShareButtonComponent,
    WatchlistButtonComponent,
    SafeUrlPipe
  ]
})
export class SharedModule {}
