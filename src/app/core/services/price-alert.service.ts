import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  collectionData,
  Timestamp,
  orderBy,
  updateDoc
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { PriceAlert, PriceAlertInput, AlertType } from '../models';

/**
 * PriceAlertService - Manages price alerts for trading analysis
 * 
 * Features:
 * - Create price alerts (entry, stop, target)
 * - Get user's active alerts
 * - Update/delete alerts
 * - Alert triggering logic
 * - Real-time price monitoring (integration ready)
 */
@Injectable({
  providedIn: 'root'
})
export class PriceAlertService {
  private alertsSubject = new BehaviorSubject<PriceAlert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.initializeAlerts();
  }

  /**
   * Initialize alerts for current user
   */
  private initializeAlerts(): void {
    this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.alertsSubject.next([]);
          return of([]);
        }
        return this.getUserAlerts(user.uid);
      })
    ).subscribe({
      next: (alerts) => {
        this.alertsSubject.next(alerts);
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
      }
    });
  }

  /**
   * Get all alerts for a user
   */
  private getUserAlerts(userId: string): Observable<PriceAlert[]> {
    const alertsRef = collection(this.firestore, 'priceAlerts');
    const q = query(
      alertsRef,
      where('userId', '==', userId),
      where('triggered', '==', false),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data['userId'],
            ticker: data['ticker'],
            alertType: data['alertType'],
            targetPrice: data['targetPrice'],
            currentPrice: data['currentPrice'],
            postId: data['postId'],
            triggered: data['triggered'],
            createdAt: data['createdAt']?.toDate() || new Date()
          } as PriceAlert;
        });
      }),
      catchError(error => {
        console.error('Error fetching alerts:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new price alert
   */
  createAlert(alertInput: PriceAlertInput, currentPrice: number): Observable<PriceAlert> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const alertsRef = collection(this.firestore, 'priceAlerts');
        const newAlertRef = doc(alertsRef);

        const alert: PriceAlert = {
          id: newAlertRef.id,
          userId: user.uid,
          ticker: alertInput.ticker.toUpperCase(),
          alertType: alertInput.alertType,
          targetPrice: alertInput.targetPrice,
          currentPrice: currentPrice,
          postId: alertInput.postId,
          triggered: false,
          createdAt: new Date()
        };

        return from(setDoc(newAlertRef, {
          userId: alert.userId,
          ticker: alert.ticker,
          alertType: alert.alertType,
          targetPrice: alert.targetPrice,
          currentPrice: alert.currentPrice,
          postId: alert.postId,
          triggered: false,
          createdAt: Timestamp.now()
        })).pipe(
          tap(() => {
            // Update local state
            const currentAlerts = this.alertsSubject.value;
            this.alertsSubject.next([alert, ...currentAlerts]);
          }),
          map(() => alert)
        );
      })
    );
  }

  /**
   * Delete a price alert
   */
  deleteAlert(alertId: string): Observable<void> {
    const alertRef = doc(this.firestore, 'priceAlerts', alertId);

    return from(deleteDoc(alertRef)).pipe(
      tap(() => {
        // Update local state
        const currentAlerts = this.alertsSubject.value;
        this.alertsSubject.next(currentAlerts.filter(a => a.id !== alertId));
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Error deleting alert:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update alert target price
   */
  updateAlert(alertId: string, newTargetPrice: number): Observable<void> {
    const alertRef = doc(this.firestore, 'priceAlerts', alertId);

    return from(updateDoc(alertRef, {
      targetPrice: newTargetPrice,
      triggered: false  // Reset if updating
    })).pipe(
      tap(() => {
        // Update local state
        const currentAlerts = this.alertsSubject.value;
        const updatedAlerts = currentAlerts.map(alert =>
          alert.id === alertId
            ? { ...alert, targetPrice: newTargetPrice, triggered: false }
            : alert
        );
        this.alertsSubject.next(updatedAlerts);
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Error updating alert:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get alerts for a specific ticker
   */
  getAlertsForTicker(ticker: string): Observable<PriceAlert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(a => a.ticker === ticker.toUpperCase()))
    );
  }

  /**
   * Get alerts for a specific post
   */
  getAlertsForPost(postId: string): Observable<PriceAlert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(a => a.postId === postId))
    );
  }

  /**
   * Check if price should trigger alert
   */
  checkAlertTrigger(alert: PriceAlert, currentPrice: number): boolean {
    switch (alert.alertType) {
      case 'ENTRY':
        // Trigger when price crosses entry (either direction based on recommendation)
        return Math.abs(currentPrice - alert.targetPrice) / alert.targetPrice < 0.01; // Within 1%
      
      case 'STOP':
        // Trigger when price hits or goes below stop
        return currentPrice <= alert.targetPrice;
      
      case 'TARGET':
        // Trigger when price hits or exceeds target
        return currentPrice >= alert.targetPrice;
      
      default:
        return false;
    }
  }

  /**
   * Mark alert as triggered
   */
  triggerAlert(alertId: string): Observable<void> {
    const alertRef = doc(this.firestore, 'priceAlerts', alertId);

    return from(updateDoc(alertRef, {
      triggered: true
    })).pipe(
      tap(() => {
        // Remove from active alerts
        const currentAlerts = this.alertsSubject.value;
        this.alertsSubject.next(currentAlerts.filter(a => a.id !== alertId));
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Error triggering alert:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): Observable<{
    total: number;
    byType: Record<AlertType, number>;
    byTicker: Record<string, number>;
  }> {
    return this.alerts$.pipe(
      map(alerts => {
        const byType: Record<AlertType, number> = {
          ENTRY: 0,
          STOP: 0,
          TARGET: 0
        };

        const byTicker: Record<string, number> = {};

        alerts.forEach(alert => {
          byType[alert.alertType]++;
          byTicker[alert.ticker] = (byTicker[alert.ticker] || 0) + 1;
        });

        return {
          total: alerts.length,
          byType,
          byTicker
        };
      })
    );
  }

  /**
   * Create alerts from analysis post
   */
  createAlertsFromPost(
    postId: string,
    ticker: string,
    entry: number,
    stop: number,
    target: number,
    currentPrice: number
  ): Observable<PriceAlert[]> {
    const alerts: PriceAlertInput[] = [
      { ticker, alertType: 'ENTRY', targetPrice: entry, postId },
      { ticker, alertType: 'STOP', targetPrice: stop, postId },
      { ticker, alertType: 'TARGET', targetPrice: target, postId }
    ];

    const createPromises = alerts.map(alert =>
      this.createAlert(alert, currentPrice).toPromise()
    );

    return from(Promise.all(createPromises)).pipe(
      map(results => results.filter((r): r is PriceAlert => r !== undefined))
    );
  }

  /**
   * Clear all alerts for user
   */
  clearAllAlerts(): Observable<void> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        return this.getUserAlerts(user.uid).pipe(
          switchMap(alerts => {
            const deletePromises = alerts.map(alert =>
              deleteDoc(doc(this.firestore, 'priceAlerts', alert.id))
            );
            return from(Promise.all(deletePromises));
          }),
          tap(() => {
            this.alertsSubject.next([]);
          }),
          map(() => undefined)
        );
      })
    );
  }
}
