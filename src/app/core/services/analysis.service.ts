import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { AnalysisPost, FeedFilters } from '../models';
import { orderBy, limit, where, QueryConstraint } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private readonly COLLECTION_PATH = 'AnalysisPosts';

  constructor(private firestoreService: FirestoreService) {}

  /**
   * Get analysis feed with optional filters
   */
  getAnalysisFeed(filters?: FeedFilters): Observable<AnalysisPost[]> {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.assetType) {
      constraints.push(where('assetType', '==', filters.assetType));
    }
    
    if (filters?.recommendation) {
      constraints.push(where('recommendation', '==', filters.recommendation));
    }
    
    if (filters?.ticker) {
      constraints.push(where('ticker', '==', filters.ticker));
    }
    
    if (filters?.minConfidence) {
      constraints.push(where('confidenceLevel', '>=', filters.minConfidence));
    }
    
    // Always order by timestamp descending
    constraints.push(orderBy('timestamp', 'desc'));
    
    // Add limit if provided
    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }
    
    return this.firestoreService.streamCollection<AnalysisPost>(
      this.COLLECTION_PATH,
      ...constraints
    );
  }

  /**
   * Get a single analysis post by ID
   */
  getPostById(id: string): Observable<AnalysisPost | null> {
    return this.firestoreService.getDocument<AnalysisPost>(`${this.COLLECTION_PATH}/${id}`);
  }

  /**
   * Get a single analysis post by ID (alias for backward compatibility)
   */
  getAnalysisById(id: string): Observable<AnalysisPost | null> {
    return this.getPostById(id);
  }

  /**
   * Search analysis posts
   */
  searchAnalysis(query: string): Observable<AnalysisPost[]> {
    const searchTerms = query.toLowerCase().split(' ');
    return this.firestoreService.streamCollection<AnalysisPost>(
      this.COLLECTION_PATH,
      where('searchTerms', 'array-contains-any', searchTerms),
      orderBy('timestamp', 'desc')
    );
  }

  /**
   * Increment view count for a post
   */
  incrementViews(postId: string): Observable<void> {
    return this.firestoreService.updateDocument(
      `${this.COLLECTION_PATH}/${postId}`,
      {
        views: this.firestoreService.increment(1),
        updatedAt: this.firestoreService.serverTimestamp()
      }
    );
  }

  /**
   * Bookmark a post (will be implemented with user service)
   */
  async bookmarkPost(postId: string): Promise<void> {
    // TODO: Implement bookmark functionality
    console.log('Bookmarking post:', postId);
  }

  /**
   * Get multiple posts by IDs
   */
  getPostsByIds(postIds: string[]): Observable<AnalysisPost[]> {
    if (postIds.length === 0) {
      return new Observable(subscriber => {
        subscriber.next([]);
        subscriber.complete();
      });
    }

    // Firestore 'in' query supports max 10 items, so we batch
    const batchSize = 10;
    const batches: Observable<AnalysisPost[]>[] = [];

    for (let i = 0; i < postIds.length; i += batchSize) {
      const batchIds = postIds.slice(i, i + batchSize);
      const batchQuery = this.firestoreService.streamCollection<AnalysisPost>(
        this.COLLECTION_PATH,
        where('id', 'in', batchIds)
      );
      batches.push(batchQuery);
    }

    // Combine all batches
    return new Observable(subscriber => {
      const results: AnalysisPost[] = [];
      let completed = 0;

      batches.forEach(batch => {
        batch.subscribe({
          next: (posts) => {
            results.push(...posts);
          },
          error: (error) => {
            subscriber.error(error);
          },
          complete: () => {
            completed++;
            if (completed === batches.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          }
        });
      });
    });
  }
}
