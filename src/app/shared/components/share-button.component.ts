import { Component, Input } from '@angular/core';
import { ToastController, ActionSheetController } from '@ionic/angular';
import { ShareService } from '../../core/services/share.service';
import { AnalysisPost } from '../../core/models';

/**
 * ShareButtonComponent - Reusable share button
 * 
 * Usage:
 * <app-share-button [post]="post"></app-share-button>
 */
@Component({
  selector: 'app-share-button',
  template: `
    <ion-button 
      fill="clear" 
      (click)="share($event)"
      [disabled]="isLoading">
      <ion-icon 
        slot="icon-only" 
        name="share-social-outline">
      </ion-icon>
    </ion-button>
  `,
  styles: [`
    ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
    }
    
    ion-icon {
      font-size: 24px;
    }
  `]
})
export class ShareButtonComponent {
  @Input() post!: AnalysisPost;
  
  isLoading = false;

  constructor(
    private shareService: ShareService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  /**
   * Share post
   */
  async share(event: Event) {
    event.stopPropagation();
    
    if (this.isLoading) {
      return;
    }

    // Check if native share is available
    const canShare = await this.shareService.canShare();

    if (canShare) {
      await this.nativeShare();
    } else {
      await this.showShareOptions();
    }
  }

  /**
   * Native share
   */
  private async nativeShare() {
    this.isLoading = true;

    try {
      const shared = await this.shareService.sharePost(this.post).toPromise();
      
      if (shared) {
        // Optional: Track share event
        console.log('Post shared:', this.post.id);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      this.showToast('Failed to share', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Show share options (fallback)
   */
  private async showShareOptions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Share Analysis',
      buttons: [
        {
          text: 'Copy Link',
          icon: 'link-outline',
          handler: () => {
            this.copyLink();
          }
        },
        {
          text: 'Share via...',
          icon: 'share-social-outline',
          handler: () => {
            this.nativeShare();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Copy link to clipboard
   */
  private async copyLink() {
    const url = `${window.location.origin}/analysis/${this.post.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('Link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      this.showToast('Failed to copy link', 'danger');
    }
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
