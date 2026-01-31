import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {
  Firestore,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { UserPreferences, ThemeMode, NotificationPreferences } from '../models';

/**
 * UserPreferencesService - Manages user settings and preferences
 * 
 * Features:
 * - Theme preferences (light/dark/auto)
 * - Notification settings
 * - Default filters
 * - Profile settings
 * - Persistent storage in Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.getDefaultPreferences());
  public preferences$ = this.preferencesSubject.asObservable();

  private readonly STORAGE_KEY = 'alpha_insights_preferences';

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.initializePreferences();
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      notifications: {
        watchlistUpdates: true,
        highConfidence: true,
        priceAlerts: true
      },
      defaultAssetFilter: undefined
    };
  }

  /**
   * Initialize preferences for current user
   */
  private initializePreferences(): void {
    // Load from localStorage first (immediate)
    this.loadLocalPreferences();

    // Then sync with Firestore
    this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.preferencesSubject.next(this.getDefaultPreferences());
          return of(null);
        }
        return this.getUserPreferences(user.uid);
      })
    ).subscribe({
      next: (preferences) => {
        if (preferences) {
          this.preferencesSubject.next(preferences);
          this.saveLocalPreferences(preferences);
        }
      },
      error: (error) => {
        console.error('Error loading preferences:', error);
      }
    });
  }

  /**
   * Load preferences from localStorage
   */
  private loadLocalPreferences(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        this.preferencesSubject.next(preferences);
      }
    } catch (error) {
      console.error('Error loading local preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  private saveLocalPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving local preferences:', error);
    }
  }

  /**
   * Get preferences from Firestore
   */
  private getUserPreferences(userId: string): Observable<UserPreferences | null> {
    const userRef = doc(this.firestore, 'users', userId);

    return from(getDoc(userRef)).pipe(
      map(snapshot => {
        if (!snapshot.exists()) {
          return null;
        }

        const data = snapshot.data();
        const notificationPrefs = data['notificationPreferences'] || {};

        return {
          theme: data['theme'] || 'auto',
          notifications: {
            watchlistUpdates: notificationPrefs['watchlistUpdates'] ?? true,
            highConfidence: notificationPrefs['highConfidence'] ?? true,
            priceAlerts: notificationPrefs['priceAlerts'] ?? true
          },
          defaultAssetFilter: data['defaultAssetFilter']
        } as UserPreferences;
      }),
      catchError(error => {
        console.error('Error fetching preferences:', error);
        return of(null);
      })
    );
  }

  /**
   * Update theme preference
   */
  updateTheme(theme: ThemeMode): Observable<void> {
    return this.updatePreferences({ theme });
  }

  /**
   * Update notification preferences
   */
  updateNotifications(notifications: Partial<NotificationPreferences>): Observable<void> {
    const currentPrefs = this.preferencesSubject.value;
    return this.updatePreferences({
      notifications: {
        ...currentPrefs.notifications,
        ...notifications
      }
    });
  }

  /**
   * Update default asset filter
   */
  updateDefaultAssetFilter(assetType: 'crypto' | 'stock' | undefined): Observable<void> {
    return this.updatePreferences({ defaultAssetFilter: assetType });
  }

  /**
   * Update preferences (generic)
   */
  updatePreferences(updates: Partial<UserPreferences>): Observable<void> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('User not authenticated'));
        }

        const currentPrefs = this.preferencesSubject.value;
        const newPrefs = { ...currentPrefs, ...updates };

        // Optimistic update
        this.preferencesSubject.next(newPrefs);
        this.saveLocalPreferences(newPrefs);

        const userRef = doc(this.firestore, 'users', user.uid);

        // Prepare Firestore update
        const firestoreUpdate: any = {};
        
        if (updates.theme !== undefined) {
          firestoreUpdate.theme = updates.theme;
        }
        
        if (updates.notifications !== undefined) {
          firestoreUpdate.notificationPreferences = updates.notifications;
        }
        
        if (updates.defaultAssetFilter !== undefined) {
          firestoreUpdate.defaultAssetFilter = updates.defaultAssetFilter;
        }

        return from(updateDoc(userRef, firestoreUpdate)).pipe(
          map(() => undefined),
          catchError(error => {
            console.error('Error updating preferences:', error);
            // Rollback optimistic update
            this.preferencesSubject.next(currentPrefs);
            this.saveLocalPreferences(currentPrefs);
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * Get current theme
   */
  getTheme(): Observable<ThemeMode> {
    return this.preferences$.pipe(
      map(prefs => prefs.theme)
    );
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.preferences$.pipe(
      map(prefs => prefs.notifications)
    );
  }

  /**
   * Check if specific notification is enabled
   */
  isNotificationEnabled(type: keyof NotificationPreferences): Observable<boolean> {
    return this.preferences$.pipe(
      map(prefs => prefs.notifications[type])
    );
  }

  /**
   * Reset to default preferences
   */
  resetToDefaults(): Observable<void> {
    const defaults = this.getDefaultPreferences();
    return this.updatePreferences(defaults);
  }

  /**
   * Get current preferences (synchronous)
   */
  getCurrentPreferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  /**
   * Apply theme to DOM
   */
  applyTheme(theme: ThemeMode): void {
    const effectiveTheme = this.resolveTheme(theme);
    document.body.classList.toggle('dark', effectiveTheme === 'dark');
  }

  /**
   * Resolve auto theme to light/dark
   */
  private resolveTheme(theme: ThemeMode): 'light' | 'dark' {
    if (theme === 'auto') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  /**
   * Initialize theme on app start
   */
  initializeTheme(): void {
    this.getTheme().subscribe(theme => {
      this.applyTheme(theme);
    });

    // Listen for theme changes
    this.preferences$.subscribe(prefs => {
      this.applyTheme(prefs.theme);
    });

    // Listen for system theme changes (if auto)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = this.preferencesSubject.value.theme;
      if (currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
}
