import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CustomReportRequest } from '../models';

export interface QuotaStatus {
  plan: 'free' | 'premium';
  quotaRemaining: number;
  quotaLimit: number;
  resetDate: string;
  totalReports: number;
}

export interface QuotaCheckResult {
  success: boolean;
  quotaRemaining: number;
  plan: 'free' | 'premium';
  message: string;
}

export interface SubmitRequestResult {
  success: boolean;
  requestId: string;
  ticker: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomRequestService {
  private quotaStatus$ = new BehaviorSubject<QuotaStatus | null>(null);
  
  constructor(private functions: Functions) {}
  
  /**
   * Get user's current quota status
   */
  getUserQuota(): Observable<QuotaStatus> {
    const callable = httpsCallable<void, QuotaStatus>(this.functions, 'getUserQuota');
    
    return from(callable()).pipe(
      map(result => result.data),
      tap(quota => this.quotaStatus$.next(quota))
    );
  }
  
  /**
   * Get current quota status as observable
   */
  getQuotaStatus(): Observable<QuotaStatus | null> {
    return this.quotaStatus$.asObservable();
  }
  
  /**
   * Check and decrement quota for a ticker
   */
  checkAndDecrementQuota(ticker: string): Observable<QuotaCheckResult> {
    const callable = httpsCallable<{ ticker: string }, QuotaCheckResult>(
      this.functions,
      'checkAndDecrementQuota'
    );
    
    return from(callable({ ticker })).pipe(
      map(result => result.data),
      tap(result => {
        // Refresh quota status if successful
        if (result.success) {
          this.getUserQuota().subscribe();
        }
      })
    );
  }
  
  /**
   * Submit custom report request
   */
  submitCustomRequest(ticker: string, assetType: 'crypto' | 'stock'): Observable<SubmitRequestResult> {
    const callable = httpsCallable<
      { ticker: string; assetType: string },
      SubmitRequestResult
    >(this.functions, 'submitCustomReportRequest');
    
    return from(callable({ ticker, assetType })).pipe(
      map(result => result.data),
      tap(() => {
        // Refresh quota status after submission
        this.getUserQuota().subscribe();
      })
    );
  }
  
  /**
   * Get user's custom request history
   */
  getUserCustomRequests(
    limit: number = 10,
    status?: 'pending' | 'processing' | 'complete' | 'failed'
  ): Observable<CustomReportRequest[]> {
    const callable = httpsCallable<
      { limit: number; status?: string },
      { requests: CustomReportRequest[] }
    >(this.functions, 'getUserCustomRequests');
    
    return from(callable({ limit, status })).pipe(
      map(result => result.data.requests)
    );
  }
  
  /**
   * Validate ticker format
   */
  validateTicker(ticker: string): { valid: boolean; error?: string } {
    const trimmed = ticker.trim().toUpperCase();
    
    if (!trimmed) {
      return { valid: false, error: 'Ticker is required' };
    }
    
    if (!/^[A-Z]{1,5}$/.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid ticker format (1-5 letters only)'
      };
    }
    
    return { valid: true };
  }
}
