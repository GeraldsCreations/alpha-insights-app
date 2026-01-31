import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap, shareReplay } from 'rxjs/operators';
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
  DocumentReference,
  Timestamp
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { Bookmark } from '../models';

/**
 * BookmarkService - Manages user bookmarks for analysis posts
 * 
 * Features:
 * - Save/unsave posts
 * - Get user's bookmarked posts
 * - Check if post is bookmarked
 * - Real-time bookmark updates
 * - Offline support with optimistic updates
 */
@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  private bookmarksSubject = new BehaviorSubject<Set<string>>(new Set());
  public bookmarks$ = this.bookmarksSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.initializeBookmarks();
  }

  /**
   * Initialize bookmarks for current user
   */
  private initializeBookmarks(): void {
    this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.bookmarksSubject.next(new Set());
          return of([]);
        }
        return this.getUserBookmarks(user.uid);
      })
    ).subscribe({
      next: (bookmarks) => {
        const bookmarkIds = new Set(bookmarks.map(b => b.postId));
        this.bookmarksSubject.next(bookmarkIds);
      },
      error: (error) => {
        console.error('Error loading bookmarks:', error);
      }
    });
  }

  /**
   * Get all bookmarks for a user
   */
  private getUserBookmarks(userId: string): Observable<Bookmark[]> {
    const bookmarksRef = collection(this.firestore, 'bookmarks');
    const q = query(bookmarksRef, where('userId', '==', userId));

    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            userId: data['userId'],
            postId: data['postId'],
            createdAt: data['createdAt']?.toDate() || new Date()
          } as Bookmark;
        });
      }),
      catchError(error => {
        console.error('Error fetching bookmarks:', error);
        return of([]);
      })
    );
  }

  /**
   * Check if a post is bookmarked by current user
   */
  isBookmarked(postId: string): Observable<boolean> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.has(postId))
    );
  }

  /**
   * Toggle bookmark for a post
   */
  toggleBookmark(postId: string): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const currentBookmarks = this.bookmarksSubject.value;
        const isCurrentlyBookmarked = currentBookmarks.has(postId);

        if (isCurrentlyBookmarked) {
          return this.removeBookmark(user.uid, postId);
        } else {
          return this.addBookmark(user.uid, postId);
        }
      })
    );
  }

  /**
   * Add a bookmark
   */
  private addBookmark(userId: string, postId: string): Observable<boolean> {
    const bookmarkId = `${userId}_${postId}`;
    const bookmarkRef = doc(this.firestore, 'bookmarks', bookmarkId);

    const bookmark: Bookmark = {
      userId,
      postId,
      createdAt: new Date()
    };

    // Optimistic update
    const currentBookmarks = this.bookmarksSubject.value;
    currentBookmarks.add(postId);
    this.bookmarksSubject.next(new Set(currentBookmarks));

    return from(setDoc(bookmarkRef, {
      userId,
      postId,
      createdAt: Timestamp.now()
    })).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error adding bookmark:', error);
        // Rollback optimistic update
        const rollbackBookmarks = this.bookmarksSubject.value;
        rollbackBookmarks.delete(postId);
        this.bookmarksSubject.next(new Set(rollbackBookmarks));
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove a bookmark
   */
  private removeBookmark(userId: string, postId: string): Observable<boolean> {
    const bookmarkId = `${userId}_${postId}`;
    const bookmarkRef = doc(this.firestore, 'bookmarks', bookmarkId);

    // Optimistic update
    const currentBookmarks = this.bookmarksSubject.value;
    currentBookmarks.delete(postId);
    this.bookmarksSubject.next(new Set(currentBookmarks));

    return from(deleteDoc(bookmarkRef)).pipe(
      map(() => false),
      catchError(error => {
        console.error('Error removing bookmark:', error);
        // Rollback optimistic update
        const rollbackBookmarks = this.bookmarksSubject.value;
        rollbackBookmarks.add(postId);
        this.bookmarksSubject.next(new Set(rollbackBookmarks));
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all bookmarked post IDs for current user
   */
  getBookmarkedPostIds(): Observable<string[]> {
    return this.bookmarks$.pipe(
      map(bookmarks => Array.from(bookmarks))
    );
  }

  /**
   * Get count of bookmarks
   */
  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.size)
    );
  }

  /**
   * Clear all bookmarks (for testing/admin)
   */
  clearAllBookmarks(): Observable<void> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        return this.getUserBookmarks(user.uid).pipe(
          switchMap(bookmarks => {
            const deletePromises = bookmarks.map(bookmark => {
              const bookmarkId = `${bookmark.userId}_${bookmark.postId}`;
              const bookmarkRef = doc(this.firestore, 'bookmarks', bookmarkId);
              return deleteDoc(bookmarkRef);
            });
            return from(Promise.all(deletePromises));
          }),
          tap(() => {
            this.bookmarksSubject.next(new Set());
          }),
          map(() => undefined)
        );
      })
    );
  }
}
