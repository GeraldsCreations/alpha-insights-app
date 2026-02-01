import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  docData 
} from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

export interface WatchlistItem {
  ticker: string;
  addedAt: Date;
  assetType?: 'crypto' | 'stock' | 'commodity';
}

/**
 * Watchlist Service
 * 
 * Manages user's watchlist in Firestore
 * Syncs with Users/{userId}/watchlist array field
 */
@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private watchlist$ = new BehaviorSubject<string[]>([]);
  private user$ = user(this.auth);

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private toastController: ToastController
  ) {
    // Subscribe to user watchlist changes
    this.user$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        
        const userRef = doc(this.firestore, `users/${user.uid}`);
        return docData(userRef).pipe(
          map((data: any) => data?.watchlist || []),
          catchError(error => {
            console.error('Error loading watchlist:', error);
            return of([]);
          })
        );
      })
    ).subscribe(watchlist => {
      this.watchlist$.next(watchlist);
    });
  }

  /**
   * Get current watchlist as observable
   */
  getWatchlist(): Observable<string[]> {
    return this.watchlist$.asObservable();
  }

  /**
   * Check if ticker is in watchlist
   */
  isWatchlisted(ticker: string): Observable<boolean> {
    return this.watchlist$.pipe(
      map(watchlist => watchlist.includes(ticker.toUpperCase()))
    );
  }

  /**
   * Add ticker to watchlist
   */
  async addToWatchlist(ticker: string, showToast: boolean = true): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const tickerUpper = ticker.toUpperCase();
    
    try {
      const userRef = doc(this.firestore, `users/${currentUser.uid}`);
      await updateDoc(userRef, {
        watchlist: arrayUnion(tickerUpper)
      });

      if (showToast) {
        await this.showToast(`${tickerUpper} added to watchlist`, 'star', 'success');
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      
      if (showToast) {
        await this.showToast('Failed to add to watchlist', 'warning', 'danger');
      }
      
      throw error;
    }
  }

  /**
   * Remove ticker from watchlist
   */
  async removeFromWatchlist(ticker: string, showToast: boolean = true): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const tickerUpper = ticker.toUpperCase();
    
    try {
      const userRef = doc(this.firestore, `users/${currentUser.uid}`);
      await updateDoc(userRef, {
        watchlist: arrayRemove(tickerUpper)
      });

      if (showToast) {
        await this.showToast(`${tickerUpper} removed from watchlist`, 'star-outline', 'medium');
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      
      if (showToast) {
        await this.showToast('Failed to remove from watchlist', 'warning', 'danger');
      }
      
      throw error;
    }
  }

  /**
   * Toggle ticker in watchlist
   */
  async toggleWatchlist(ticker: string, showToast: boolean = true): Promise<boolean> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const tickerUpper = ticker.toUpperCase();
    const currentWatchlist = this.watchlist$.value;
    const isCurrentlyWatchlisted = currentWatchlist.includes(tickerUpper);

    if (isCurrentlyWatchlisted) {
      await this.removeFromWatchlist(tickerUpper, showToast);
      return false;
    } else {
      await this.addToWatchlist(tickerUpper, showToast);
      return true;
    }
  }

  /**
   * Clear entire watchlist
   */
  async clearWatchlist(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const userRef = doc(this.firestore, `users/${currentUser.uid}`);
      await updateDoc(userRef, {
        watchlist: []
      });

      await this.showToast('Watchlist cleared', 'trash', 'medium');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      throw error;
    }
  }

  /**
   * Get watchlist count
   */
  getWatchlistCount(): Observable<number> {
    return this.watchlist$.pipe(
      map(watchlist => watchlist.length)
    );
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, icon: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      icon,
      cssClass: 'watchlist-toast'
    });
    await toast.present();
  }
}
