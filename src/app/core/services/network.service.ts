import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    this.initNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  private initNetworkMonitoring() {
    // Listen to online/offline events
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(status => {
      console.log('Network status changed:', status ? 'online' : 'offline');
      this.onlineSubject.next(status);
    });

    // Initial check
    this.checkNetworkStatus();

    // Periodic check every 30 seconds
    setInterval(() => {
      this.checkNetworkStatus();
    }, 30000);
  }

  /**
   * Check current network status
   */
  private checkNetworkStatus() {
    const isOnline = navigator.onLine;
    if (this.onlineSubject.value !== isOnline) {
      this.onlineSubject.next(isOnline);
    }
  }

  /**
   * Get current network status
   */
  isOnline(): boolean {
    return this.onlineSubject.value;
  }

  /**
   * Get current network status as observable
   */
  getNetworkStatus(): Observable<boolean> {
    return this.online$;
  }

  /**
   * Wait for network to be available
   */
  waitForNetwork(): Promise<void> {
    if (this.isOnline()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const subscription = this.online$.subscribe(isOnline => {
        if (isOnline) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * Execute function with retry on network error
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for network if offline
        if (!this.isOnline()) {
          console.log('Offline detected, waiting for network...');
          await this.waitForNetwork();
        }

        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a network error
        const isNetworkError = error.message?.includes('network') || 
                              error.message?.includes('Failed to fetch') ||
                              error.code === 'unavailable';

        if (!isNetworkError) {
          // Not a network error, throw immediately
          throw error;
        }

        if (attempt < maxRetries) {
          const backoffDelay = delayMs * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);
          await this.delay(backoffDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection type (if available)
   */
  getConnectionType(): string {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
  }

  /**
   * Check if connection is slow
   */
  isSlowConnection(): boolean {
    const connectionType = this.getConnectionType();
    return connectionType === 'slow-2g' || connectionType === '2g';
  }

  /**
   * Get estimated downlink speed (Mbps)
   */
  getDownlinkSpeed(): number | null {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection && connection.downlink) {
      return connection.downlink;
    }
    
    return null;
  }
}
