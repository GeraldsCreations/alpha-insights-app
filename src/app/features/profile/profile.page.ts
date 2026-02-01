import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User data
  currentUser: User | null = null;
  
  // Stats
  bookmarkCount = 0;

  constructor(
    private authService: AuthService,
    private bookmarkService: BookmarkService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadStats();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user data
   */
  loadUserData() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  /**
   * Load user stats
   */
  loadStats() {
    this.bookmarkService.getBookmarkCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.bookmarkCount = count;
      });
  }

  /**
   * Navigate to saved posts
   */
  viewSavedPosts() {
    this.router.navigate(['/profile/saved']);
  }

  /**
   * Navigate to settings
   */
  viewSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Navigate to edit profile
   */
  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  /**
   * Navigate to help
   */
  viewHelp() {
    this.router.navigate(['/help']);
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    if (!this.currentUser?.displayName) {
      return '?';
    }
    const names = this.currentUser.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return this.currentUser.displayName.substring(0, 2).toUpperCase();
  }

  /**
   * Get avatar URL or default
   */
  getAvatarUrl(): string {
    return this.currentUser?.photoURL || 'assets/img/default-avatar.png';
  }
}
