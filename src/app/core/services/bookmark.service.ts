import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  collectionData,
  docData,
  getDocs,
  serverTimestamp
} from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map, switchMap, tap, catchError, take } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

export interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  ticker: string;
  title: string;
  createdAt: any;
}

/**
 * Bookmark Service
 * 
 * Manages user bookmarks in Firestore
 * Collection: bookmarks/{bookmarkId}
 * 
 * Features:
 * - Add/remove bookmarks
 * - Get user's bookmarked posts
 * - Check if post is bookmarked
 * - Sync with Cloud Functions for bookmark count updates
 */
@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  private bookmarks$ = new BehaviorSubject<Bookmark[]>([]);
  private user$ = user(this.auth);

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private toastController: ToastController
  ) {
    // Subscribe to user bookmarks changes
    this.user$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const bookmarksRef = collection(this.firestore, 'bookmarks');
        const q = query(
          bookmarksRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }) as Observable<Bookmark[]>;
      }),
      catchError(error => {
        console.error('Error loading bookmarks:', error);
        return of([]);
      })
    ).subscribe(bookmarks => {
      this.bookmarks$.next(bookmarks);
    });
  }

  /**
   * Get current bookmarks as observable
   */
  getBookmarks(): Observable<Bookmark[]> {
    return this.bookmarks$.asObservable();
  }

  /**
   * Check if post is bookmarked
   */
  isBookmarked(postId: string): Observable<boolean> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.some(b => b.postId === postId))
    );
  }

  /**
   * Add bookmark
   */
  async addBookmark(
    postId: string,
    ticker: string,
    title: string,
    showToast: boolean = true
  ): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      // Create unique bookmark ID based on user + post
      const bookmarkId = `${currentUser.uid}_${postId}`;
      const bookmarkRef = doc(this.firestore, `bookmarks/${bookmarkId}`);

      await setDoc(bookmarkRef, {
        userId: currentUser.uid,
        postId,
        ticker,
        title,
        createdAt: serverTimestamp()
      });

      if (showToast) {
        await this.showToast('Bookmark added', 'bookmark', 'success');
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);

      if (showToast) {
        await this.showToast('Failed to add bookmark', 'warning', 'danger');
      }

      throw error;
    }
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(postId: string, showToast: boolean = true): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const bookmarkId = `${currentUser.uid}_${postId}`;
      const bookmarkRef = doc(this.firestore, `bookmarks/${bookmarkId}`);

      await deleteDoc(bookmarkRef);

      if (showToast) {
        await this.showToast('Bookmark removed', 'bookmark-outline', 'medium');
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);

      if (showToast) {
        await this.showToast('Failed to remove bookmark', 'warning', 'danger');
      }

      throw error;
    }
  }

  /**
   * Toggle bookmark
   */
  async toggleBookmark(
    postId: string,
    ticker: string,
    title: string,
    showToast: boolean = true
  ): Promise<boolean> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const isCurrentlyBookmarked = await this.isBookmarked(postId)
      .pipe(take(1))
      .toPromise();

    if (isCurrentlyBookmarked) {
      await this.removeBookmark(postId, showToast);
      return false;
    } else {
      await this.addBookmark(postId, ticker, title, showToast);
      return true;
    }
  }

  /**
   * Get bookmarked post IDs
   */
  getBookmarkedPostIds(): Observable<string[]> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.map(b => b.postId))
    );
  }

  /**
   * Get bookmark count
   */
  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.length)
    );
  }

  /**
   * Clear all bookmarks (dangerous - confirm first!)
   */
  async clearAllBookmarks(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const bookmarksRef = collection(this.firestore, 'bookmarks');
      const q = query(bookmarksRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await this.showToast('All bookmarks cleared', 'trash', 'medium');
    } catch (error) {
      console.error('Error clearing bookmarks:', error);
      throw error;
    }
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
      cssClass: 'bookmark-toast'
    });
    await toast.present();
  }
}
