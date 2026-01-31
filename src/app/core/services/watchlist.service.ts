import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError, combineLatest } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {
  Firestore,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

/**
 * WatchlistService - Manages user's ticker watchlist
 * 
 * Features:
 * - Add/remove tickers from watchlist
 * - Get watchlist for current user
 * - Check if ticker is in watchlist
 * - Real-time watchlist updates
 * - Optimistic UI updates
 */
@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private watchlistSubject = new BehaviorSubject<string[]>([]);
  public watchlist$ = this.watchlistSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.initializeWatchlist();
  }

  /**
   * Initialize watchlist for current user
   */
  private initializeWatchlist(): void {
    this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.watchlistSubject.next([]);
          return of([]);
        }
        return this.getUserWatchlist(user.uid);
      })
    ).subscribe({
      next: (watchlist) => {
        this.watchlistSubject.next(watchlist);
      },
      error: (error) => {
        console.error('Error loading watchlist:', error);
      }
    });
  }

  /**
   * Get watchlist from user document
   */
  private getUserWatchlist(userId: string): Observable<string[]> {
    const userRef = doc(this.firestore, 'users', userId);

    return from(getDoc(userRef)).pipe(
      map(snapshot => {
        if (!snapshot.exists()) {
          return [];
        }
        const data = snapshot.data();
        return data['watchlist'] || [];
      }),
      catchError(error => {
        console.error('Error fetching watchlist:', error);
        return of([]);
      })
    );
  }

  /**
   * Add ticker to watchlist
   */
  addToWatchlist(ticker: string): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const normalizedTicker = ticker.toUpperCase().trim();

        // Check if already in watchlist
        const currentWatchlist = this.watchlistSubject.value;
        if (currentWatchlist.includes(normalizedTicker)) {
          return of(true);
        }

        // Optimistic update
        this.watchlistSubject.next([...currentWatchlist, normalizedTicker]);

        const userRef = doc(this.firestore, 'users', user.uid);

        return from(updateDoc(userRef, {
          watchlist: arrayUnion(normalizedTicker)
        })).pipe(
          map(() => true),
          catchError(error => {
            console.error('Error adding to watchlist:', error);
            // Rollback optimistic update
            this.watchlistSubject.next(currentWatchlist);
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * Remove ticker from watchlist
   */
  removeFromWatchlist(ticker: string): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const normalizedTicker = ticker.toUpperCase().trim();
        const currentWatchlist = this.watchlistSubject.value;

        // Optimistic update
        const updatedWatchlist = currentWatchlist.filter(t => t !== normalizedTicker);
        this.watchlistSubject.next(updatedWatchlist);

        const userRef = doc(this.firestore, 'users', user.uid);

        return from(updateDoc(userRef, {
          watchlist: arrayRemove(normalizedTicker)
        })).pipe(
          map(() => false),
          catchError(error => {
            console.error('Error removing from watchlist:', error);
            // Rollback optimistic update
            this.watchlistSubject.next(currentWatchlist);
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * Toggle ticker in watchlist
   */
  toggleWatchlist(ticker: string): Observable<boolean> {
    const normalizedTicker = ticker.toUpperCase().trim();
    const currentWatchlist = this.watchlistSubject.value;

    if (currentWatchlist.includes(normalizedTicker)) {
      return this.removeFromWatchlist(normalizedTicker);
    } else {
      return this.addToWatchlist(normalizedTicker);
    }
  }

  /**
   * Check if ticker is in watchlist
   */
  isInWatchlist(ticker: string): Observable<boolean> {
    const normalizedTicker = ticker.toUpperCase().trim();
    return this.watchlist$.pipe(
      map(watchlist => watchlist.includes(normalizedTicker))
    );
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
   * Get current watchlist (synchronous)
   */
  getCurrentWatchlist(): string[] {
    return this.watchlistSubject.value;
  }

  /**
   * Clear entire watchlist
   */
  clearWatchlist(): Observable<void> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const userRef = doc(this.firestore, 'users', user.uid);

        return from(updateDoc(userRef, {
          watchlist: []
        })).pipe(
          tap(() => {
            this.watchlistSubject.next([]);
          }),
          map(() => undefined)
        );
      })
    );
  }

  /**
   * Bulk add tickers to watchlist
   */
  addMultipleToWatchlist(tickers: string[]): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const normalizedTickers = tickers.map(t => t.toUpperCase().trim());
        const currentWatchlist = this.watchlistSubject.value;
        
        // Filter out duplicates
        const newTickers = normalizedTickers.filter(t => !currentWatchlist.includes(t));
        
        if (newTickers.length === 0) {
          return of(true);
        }

        // Optimistic update
        this.watchlistSubject.next([...currentWatchlist, ...newTickers]);

        const userRef = doc(this.firestore, 'users', user.uid);

        // Add all tickers at once
        const updatePromises = newTickers.map(ticker =>
          updateDoc(userRef, {
            watchlist: arrayUnion(ticker)
          })
        );

        return from(Promise.all(updatePromises)).pipe(
          map(() => true),
          catchError(error => {
            console.error('Error adding multiple to watchlist:', error);
            // Rollback optimistic update
            this.watchlistSubject.next(currentWatchlist);
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * Get watchlist with real-time price data (future integration)
   */
  getWatchlistWithPrices(): Observable<Array<{ticker: string; price?: number; change?: number}>> {
    return this.watchlist$.pipe(
      map(watchlist => {
        // TODO: Integrate with price service
        return watchlist.map(ticker => ({
          ticker,
          price: undefined,
          change: undefined
        }));
      })
    );
  }

  /**
   * Validate ticker symbol (basic validation)
   */
  private isValidTicker(ticker: string): boolean {
    // Basic validation: 1-5 uppercase letters
    const tickerRegex = /^[A-Z]{1,5}$/;
    return tickerRegex.test(ticker.toUpperCase().trim());
  }

  /**
   * Add ticker with validation
   */
  addToWatchlistWithValidation(ticker: string): Observable<boolean> {
    const normalizedTicker = ticker.toUpperCase().trim();

    if (!this.isValidTicker(normalizedTicker)) {
      return throwError(() => new Error('Invalid ticker symbol'));
    }

    return this.addToWatchlist(normalizedTicker);
  }
}
