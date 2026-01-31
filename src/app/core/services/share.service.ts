import { Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { Platform } from '@ionic/angular';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalysisPost } from '../models';

/**
 * ShareService - Handles native sharing functionality
 * 
 * Features:
 * - Share analysis posts via native share sheet
 * - Share links, text, and files
 * - Platform detection (mobile vs web)
 * - Fallback to Web Share API or clipboard
 */
@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private isNativeShare: boolean = false;

  constructor(private platform: Platform) {
    this.isNativeShare = this.platform.is('capacitor');
  }

  /**
   * Check if native sharing is available
   */
  async canShare(): Promise<boolean> {
    try {
      // Check Capacitor Share plugin
      if (this.isNativeShare) {
        return true;
      }

      // Check Web Share API
      if (navigator.share) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking share capability:', error);
      return false;
    }
  }

  /**
   * Share an analysis post
   */
  sharePost(post: AnalysisPost): Observable<boolean> {
    const shareData = {
      title: post.title,
      text: `${post.title}\n\n${post.description}\n\nTicker: $${post.ticker}\nRecommendation: ${post.recommendation}`,
      url: this.getPostUrl(post.id),
    };

    return this.share(shareData);
  }

  /**
   * Share custom content
   */
  share(data: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Observable<boolean> {
    return from(this.performShare(data)).pipe(
      map(() => true),
      catchError(error => {
        // User cancelled share - not an error
        if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
          return of(false);
        }
        
        console.error('Share error:', error);
        
        // Fallback to clipboard
        if (data.url || data.text) {
          this.copyToClipboard(data.url || data.text || '');
        }
        
        return of(false);
      })
    );
  }

  /**
   * Internal share implementation
   */
  private async performShare(data: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<void> {
    // Try Capacitor Share plugin first (mobile)
    if (this.isNativeShare) {
      await Share.share({
        title: data.title,
        text: data.text,
        url: data.url,
        dialogTitle: data.dialogTitle || 'Share via',
      });
      return;
    }

    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return;
    }

    // Last resort: copy to clipboard
    if (data.url || data.text) {
      await this.copyToClipboard(data.url || data.text || '');
      throw new Error('Share not supported - link copied to clipboard');
    }

    throw new Error('Share not supported on this device');
  }

  /**
   * Share a link
   */
  shareLink(url: string, title?: string, text?: string): Observable<boolean> {
    return this.share({ url, title, text });
  }

  /**
   * Share plain text
   */
  shareText(text: string, title?: string): Observable<boolean> {
    return this.share({ text, title });
  }

  /**
   * Generate post URL
   */
  private getPostUrl(postId: string): string {
    // TODO: Update with actual production URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/analysis/${postId}`;
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Get share count for a post (future feature)
   */
  getShareCount(postId: string): Observable<number> {
    // TODO: Implement share tracking in Firestore
    return of(0);
  }

  /**
   * Track share event (analytics)
   */
  private trackShareEvent(postId: string, method: string): void {
    // TODO: Implement analytics tracking
    console.log('Share tracked:', { postId, method });
  }
}
