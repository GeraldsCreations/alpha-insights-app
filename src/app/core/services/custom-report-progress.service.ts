import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  collection,
  query,
  where,
  orderBy,
  collectionData,
  onSnapshot 
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CustomReportProgress {
  requestId: string;
  ticker: string;
  assetType: 'crypto' | 'stock' | 'commodity';
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining: number; // seconds
  createdAt: Date;
  completedAt?: Date;
  reportId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomReportProgressService {
  private progressCache = new Map<string, BehaviorSubject<CustomReportProgress>>();
  
  constructor(private firestore: Firestore) {}
  
  /**
   * Monitor a custom report request in real-time
   */
  monitorProgress(requestId: string): Observable<CustomReportProgress> {
    // Return cached observable if already monitoring
    if (this.progressCache.has(requestId)) {
      return this.progressCache.get(requestId)!.asObservable();
    }
    
    const subject = new BehaviorSubject<CustomReportProgress>({
      requestId,
      ticker: '',
      assetType: 'crypto',
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      estimatedTimeRemaining: 10,
      createdAt: new Date()
    });
    
    this.progressCache.set(requestId, subject);
    
    // Listen to Firestore document
    const docRef = doc(this.firestore, `custom_report_requests/${requestId}`);
    
    onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        subject.next({
          ...subject.value,
          status: 'failed',
          error: 'Request not found',
          progress: 0,
          currentStep: 'Error: Request not found'
        });
        return;
      }
      
      const data = snapshot.data();
      const progress = this.calculateProgress(data['status'], data['createdAt'], data['completedAt']);
      
      subject.next({
        requestId,
        ticker: data['ticker'] || '',
        assetType: data['assetType'] || 'crypto',
        status: data['status'] || 'pending',
        progress: progress.percent,
        currentStep: progress.step,
        estimatedTimeRemaining: progress.timeRemaining,
        createdAt: data['createdAt']?.toDate() || new Date(),
        completedAt: data['completedAt']?.toDate(),
        reportId: data['reportId'],
        error: data['error']
      });
      
      // Stop monitoring when complete or failed
      if (data['status'] === 'complete' || data['status'] === 'failed') {
        setTimeout(() => {
          this.progressCache.delete(requestId);
        }, 60000); // Clean up after 1 minute
      }
    });
    
    return subject.asObservable();
  }
  
  /**
   * Calculate progress based on status and timing
   */
  private calculateProgress(status: string, createdAt: any, completedAt: any): {
    percent: number;
    step: string;
    timeRemaining: number;
  } {
    const now = new Date();
    const created = createdAt?.toDate() || now;
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 1000); // seconds
    
    switch (status) {
      case 'pending':
        return {
          percent: 10,
          step: 'Queued for processing...',
          timeRemaining: 8
        };
      
      case 'processing':
        // Estimate based on typical processing time (5-10 seconds)
        const estimatedTotal = 10; // seconds
        const progressPercent = Math.min(90, 20 + (elapsed / estimatedTotal) * 70);
        
        let step = 'Fetching market data...';
        if (elapsed > 2) step = 'Analyzing technical indicators...';
        if (elapsed > 4) step = 'Generating analysis report...';
        if (elapsed > 6) step = 'Finalizing report...';
        
        return {
          percent: Math.round(progressPercent),
          step,
          timeRemaining: Math.max(1, estimatedTotal - elapsed)
        };
      
      case 'complete':
        return {
          percent: 100,
          step: 'Analysis complete! 🎉',
          timeRemaining: 0
        };
      
      case 'failed':
        return {
          percent: 0,
          step: 'Processing failed',
          timeRemaining: 0
        };
      
      default:
        return {
          percent: 0,
          step: 'Unknown status',
          timeRemaining: 0
        };
    }
  }
  
  /**
   * Stop monitoring a request
   */
  stopMonitoring(requestId: string): void {
    const subject = this.progressCache.get(requestId);
    if (subject) {
      subject.complete();
      this.progressCache.delete(requestId);
    }
  }
  
  /**
   * Get all active (in-progress) requests for a user
   */
  getActiveRequests(userId: string): Observable<CustomReportProgress[]> {
    const requestsRef = collection(this.firestore, 'custom_report_requests');
    const q = query(
      requestsRef,
      where('userId', '==', userId),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((requests: any[]) => 
        requests.map(req => {
          const progress = this.calculateProgress(req.status, req.createdAt, req.completedAt);
          return {
            requestId: req.id,
            ticker: req.ticker || '',
            assetType: req.assetType || 'crypto',
            status: req.status || 'pending',
            progress: progress.percent,
            currentStep: progress.step,
            estimatedTimeRemaining: progress.timeRemaining,
            createdAt: req.createdAt?.toDate() || new Date(),
            completedAt: req.completedAt?.toDate(),
            reportId: req.reportId,
            error: req.error
          };
        })
      )
    );
  }

  /**
   * Get all completed requests for a user
   */
  getCompletedRequests(userId: string, limit: number = 10): Observable<CustomReportProgress[]> {
    const requestsRef = collection(this.firestore, 'custom_report_requests');
    const q = query(
      requestsRef,
      where('userId', '==', userId),
      where('status', '==', 'complete'),
      orderBy('completedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((requests: any[]) => 
        requests.slice(0, limit).map(req => ({
          requestId: req.id,
          ticker: req.ticker || '',
          assetType: req.assetType || 'crypto',
          status: req.status || 'complete',
          progress: 100,
          currentStep: 'Analysis complete! 🎉',
          estimatedTimeRemaining: 0,
          createdAt: req.createdAt?.toDate() || new Date(),
          completedAt: req.completedAt?.toDate(),
          reportId: req.reportId,
          error: req.error
        }))
      )
    );
  }

  /**
   * Get all requests (any status) for a user
   */
  getAllRequests(userId: string, limit: number = 20): Observable<CustomReportProgress[]> {
    const requestsRef = collection(this.firestore, 'custom_report_requests');
    const q = query(
      requestsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((requests: any[]) => 
        requests.slice(0, limit).map(req => {
          const progress = this.calculateProgress(req.status, req.createdAt, req.completedAt);
          return {
            requestId: req.id,
            ticker: req.ticker || '',
            assetType: req.assetType || 'crypto',
            status: req.status || 'pending',
            progress: progress.percent,
            currentStep: progress.step,
            estimatedTimeRemaining: progress.timeRemaining,
            createdAt: req.createdAt?.toDate() || new Date(),
            completedAt: req.completedAt?.toDate(),
            reportId: req.reportId,
            error: req.error
          };
        })
      )
    );
  }
}
