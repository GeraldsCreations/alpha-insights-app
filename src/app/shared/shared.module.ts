import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BookmarkButtonComponent } from './components/bookmark-button.component';
import { ShareButtonComponent } from './components/share-button.component';
import { WatchlistButtonComponent } from './components/watchlist-button.component';

/**
 * SharedModule - Contains reusable components, directives, and pipes
 */
@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    BookmarkButtonComponent,
    ShareButtonComponent,
    WatchlistButtonComponent
  ],
  exports: [
    BookmarkButtonComponent,
    ShareButtonComponent,
    WatchlistButtonComponent
  ]
})
export class SharedModule {}
