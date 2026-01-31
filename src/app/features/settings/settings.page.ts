import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { UserPreferencesService } from '../../core/services/user-preferences.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeMode, NotificationPreferences, UserPreferences } from '../../core/models';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class SettingsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Settings state
  preferences: UserPreferences;
  currentTheme: ThemeMode = 'auto';
  notificationSettings: NotificationPreferences = {
    watchlistUpdates: true,
    highConfidence: true,
    priceAlerts: true
  };
  defaultAssetFilter: 'crypto' | 'stock' | 'all' = 'all';

  // User info
  userEmail: string = '';
  userName: string = '';

  constructor(
    private preferencesService: UserPreferencesService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.preferences = this.preferencesService.getCurrentPreferences();
  }

  ngOnInit() {
    this.loadPreferences();
    this.loadUserInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user preferences
   */
  loadPreferences() {
    this.preferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prefs => {
        this.preferences = prefs;
        this.currentTheme = prefs.theme;
        this.notificationSettings = prefs.notifications;
        this.defaultAssetFilter = prefs.defaultAssetFilter || 'all';
      });
  }

  /**
   * Load user info
   */
  loadUserInfo() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.userEmail = user.email || '';
          this.userName = user.displayName || '';
        }
      });
  }

  /**
   * Handle theme change
   */
  async onThemeChange(event: any) {
    const theme = event.detail.value as ThemeMode;
    
    try {
      await this.preferencesService.updateTheme(theme).toPromise();
      this.showToast('Theme updated');
    } catch (error) {
      console.error('Error updating theme:', error);
      this.showToast('Failed to update theme', 'danger');
    }
  }

  /**
   * Handle notification toggle
   */
  async onNotificationToggle(key: keyof NotificationPreferences, event: any) {
    const value = event.detail.checked;
    
    try {
      await this.preferencesService.updateNotifications({ [key]: value }).toPromise();
    } catch (error) {
      console.error('Error updating notification settings:', error);
      this.showToast('Failed to update notification settings', 'danger');
      // Revert toggle
      this.notificationSettings[key] = !value;
    }
  }

  /**
   * Handle default asset filter change
   */
  async onDefaultAssetFilterChange(event: any) {
    const filter = event.detail.value;
    const assetType = filter === 'all' ? undefined : filter;
    
    try {
      await this.preferencesService.updateDefaultAssetFilter(assetType).toPromise();
      this.showToast('Default filter updated');
    } catch (error) {
      console.error('Error updating default filter:', error);
      this.showToast('Failed to update default filter', 'danger');
    }
  }

  /**
   * Navigate to profile edit
   */
  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  /**
   * Clear cache
   */
  async clearCache() {
    const alert = await this.alertController.create({
      header: 'Clear Cache',
      message: 'This will clear all locally stored data. You may need to reload content.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Clearing cache...'
            });
            await loading.present();

            try {
              // Clear localStorage
              localStorage.clear();
              
              // Reload preferences
              this.loadPreferences();
              
              await loading.dismiss();
              this.showToast('Cache cleared successfully');
            } catch (error) {
              await loading.dismiss();
              console.error('Error clearing cache:', error);
              this.showToast('Failed to clear cache', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    const alert = await this.alertController.create({
      header: 'Reset Settings',
      message: 'This will reset all settings to their default values.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: async () => {
            try {
              await this.preferencesService.resetToDefaults().toPromise();
              this.showToast('Settings reset to defaults');
            } catch (error) {
              console.error('Error resetting settings:', error);
              this.showToast('Failed to reset settings', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Change password
   */
  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Change Password',
      message: 'A password reset link will be sent to your email.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send Link',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Sending...'
            });
            await loading.present();

            try {
              await this.authService.resetPassword(this.userEmail);
              await loading.dismiss();
              this.showToast('Password reset link sent to your email');
            } catch (error) {
              await loading.dismiss();
              console.error('Error sending password reset:', error);
              this.showToast('Failed to send password reset link', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Logout
   */
  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            try {
              await this.authService.signOut();
              this.router.navigate(['/login']);
            } catch (error) {
              console.error('Error logging out:', error);
              this.showToast('Failed to logout', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
