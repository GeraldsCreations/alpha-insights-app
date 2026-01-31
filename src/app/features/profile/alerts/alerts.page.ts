import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertController, ToastController } from '@ionic/angular';
import { PriceAlertService } from '../../../core/services/price-alert.service';
import { PriceAlert, AlertType } from '../../../core/models';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
})
export class AlertsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  alerts: PriceAlert[] = [];
  loading = false;

  // Stats
  entryAlerts = 0;
  stopAlerts = 0;
  targetAlerts = 0;

  constructor(
    private priceAlertService: PriceAlertService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadAlerts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load alerts
   */
  loadAlerts() {
    this.loading = true;

    this.priceAlertService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
          this.calculateStats(alerts);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
          this.showToast('Failed to load alerts', 'danger');
          this.loading = false;
        }
      });
  }

  /**
   * Calculate alert statistics
   */
  calculateStats(alerts: PriceAlert[]) {
    this.entryAlerts = alerts.filter(a => a.alertType === 'ENTRY').length;
    this.stopAlerts = alerts.filter(a => a.alertType === 'STOP').length;
    this.targetAlerts = alerts.filter(a => a.alertType === 'TARGET').length;
  }

  /**
   * Delete alert
   */
  async deleteAlert(alert: PriceAlert) {
    const confirm = await this.alertController.create({
      header: 'Delete Alert',
      message: `Remove ${alert.ticker} ${alert.alertType} alert at $${alert.targetPrice}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.priceAlertService.deleteAlert(alert.id).toPromise();
              this.showToast('Alert deleted');
            } catch (error) {
              console.error('Error deleting alert:', error);
              this.showToast('Failed to delete alert', 'danger');
            }
          }
        }
      ]
    });

    await confirm.present();
  }

  /**
   * Edit alert
   */
  async editAlert(alert: PriceAlert) {
    const alertDialog = await this.alertController.create({
      header: 'Edit Alert',
      message: `${alert.ticker} ${alert.alertType}`,
      inputs: [
        {
          name: 'targetPrice',
          type: 'number',
          value: alert.targetPrice,
          placeholder: 'Target Price'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: async (data) => {
            const newPrice = parseFloat(data.targetPrice);
            
            if (isNaN(newPrice) || newPrice <= 0) {
              this.showToast('Invalid price', 'warning');
              return false;
            }

            try {
              await this.priceAlertService.updateAlert(alert.id, newPrice).toPromise();
              this.showToast('Alert updated');
              return true;
            } catch (error) {
              console.error('Error updating alert:', error);
              this.showToast('Failed to update alert', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alertDialog.present();
  }

  /**
   * Clear all alerts
   */
  async clearAllAlerts() {
    if (this.alerts.length === 0) {
      return;
    }

    const confirm = await this.alertController.create({
      header: 'Clear All Alerts',
      message: 'Remove all price alerts?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear All',
          role: 'destructive',
          handler: async () => {
            try {
              await this.priceAlertService.clearAllAlerts().toPromise();
              this.showToast('All alerts cleared');
            } catch (error) {
              console.error('Error clearing alerts:', error);
              this.showToast('Failed to clear alerts', 'danger');
            }
          }
        }
      ]
    });

    await confirm.present();
  }

  /**
   * Get alert type color
   */
  getAlertTypeColor(type: AlertType): string {
    switch (type) {
      case 'ENTRY':
        return 'primary';
      case 'STOP':
        return 'danger';
      case 'TARGET':
        return 'success';
      default:
        return 'medium';
    }
  }

  /**
   * Get alert type icon
   */
  getAlertTypeIcon(type: AlertType): string {
    switch (type) {
      case 'ENTRY':
        return 'log-in-outline';
      case 'STOP':
        return 'stop-circle-outline';
      case 'TARGET':
        return 'flag-outline';
      default:
        return 'pricetag-outline';
    }
  }

  /**
   * Calculate price difference
   */
  getPriceDifference(alert: PriceAlert): string {
    const diff = ((alert.targetPrice - alert.currentPrice) / alert.currentPrice) * 100;
    const prefix = diff > 0 ? '+' : '';
    return `${prefix}${diff.toFixed(2)}%`;
  }

  /**
   * Handle refresh
   */
  handleRefresh(event: any) {
    this.loadAlerts();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Show toast
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
