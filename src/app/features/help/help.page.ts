import { Component } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { ToastController, AlertController } from '@ionic/angular';
import { environment } from '../../../environments/environment';

interface FAQ {
  question: string;
  answer: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  standalone: false
})
export class HelpPage {
  supportEmail = environment.app.supportEmail;
  
  faqs: FAQ[] = [
    {
      question: 'How do I request custom research?',
      answer: 'Navigate to the Request Analysis page, enter your desired ticker, select the asset type (crypto/stock), and submit. Free users get 5 custom reports per month, premium users get 10.',
      expanded: false
    },
    {
      question: 'What does the confidence level mean?',
      answer: 'Our confidence level (1-10) indicates how strong the analysis signals are. 8+ is high confidence, 6-7 is moderate, and below 6 is low confidence.',
      expanded: false
    },
    {
      question: 'How often is the data updated?',
      answer: 'Market data refreshes in real-time. New research reports are published daily at 6 AM EST for our core watchlist tickers.',
      expanded: false
    },
    {
      question: 'Can I bookmark and share reports?',
      answer: 'Yes! Tap the bookmark icon to save reports for later. Use the share button to send analysis to friends via your device\'s native share menu.',
      expanded: false
    },
    {
      question: 'What is the watchlist feature?',
      answer: 'Add tickers to your watchlist to get push notifications when new analysis is published for those assets. Tap the star icon on any report to add it.',
      expanded: false
    },
    {
      question: 'How do price alerts work?',
      answer: 'Set entry, stop-loss, or target alerts from the analysis detail page. We\'ll send you a push notification when the price reaches your target.',
      expanded: false
    },
    {
      question: 'What\'s the difference between free and premium?',
      answer: 'Premium users get more custom report requests per month (10 vs 5), priority support, and early access to new features.',
      expanded: false
    },
    {
      question: 'How do I upgrade to premium?',
      answer: 'Premium subscriptions coming soon! We\'re currently in beta. Stay tuned for announcements.',
      expanded: false
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! All data is encrypted in transit and stored securely on Firebase. We never share your personal information with third parties.',
      expanded: false
    },
    {
      question: 'Can I export my bookmarks?',
      answer: 'Bookmark export feature is coming soon. For now, all bookmarks are synced to your account and accessible on any device.',
      expanded: false
    }
  ];

  quickLinks = [
    {
      title: 'Documentation',
      icon: 'book-outline',
      description: 'Read our complete user guide',
      url: 'https://docs.alphainsights.com'
    },
    {
      title: 'API Reference',
      icon: 'code-slash-outline',
      description: 'Integrate with our API',
      url: 'https://api.alphainsights.com/docs'
    },
    {
      title: 'Community Forum',
      icon: 'people-outline',
      description: 'Join our trader community',
      url: 'https://community.alphainsights.com'
    },
    {
      title: 'Feature Requests',
      icon: 'bulb-outline',
      description: 'Suggest new features',
      url: 'https://feedback.alphainsights.com'
    }
  ];

  constructor(
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  /**
   * Toggle FAQ expansion
   */
  toggleFaq(faq: FAQ) {
    faq.expanded = !faq.expanded;
  }

  /**
   * Open external link
   */
  async openLink(url: string) {
    try {
      await Browser.open({ url });
    } catch (error) {
      console.error('Error opening link:', error);
      await this.showToast('Could not open link', 'danger');
    }
  }

  /**
   * Contact support
   */
  async contactSupport() {
    const alert = await this.alertController.create({
      header: 'Contact Support',
      message: 'How would you like to reach us?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Email',
          handler: () => {
            this.openEmail();
          }
        },
        {
          text: 'Report Bug',
          handler: () => {
            this.reportBug();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Open email client
   */
  private async openEmail() {
    const subject = encodeURIComponent('Alpha Insights Support Request');
    const body = encodeURIComponent(
      'Please describe your issue or question:\n\n' +
      '---\n' +
      `App Version: ${environment.app.version}\n` +
      `Platform: ${this.getPlatform()}\n`
    );
    
    window.location.href = `mailto:${this.supportEmail}?subject=${subject}&body=${body}`;
  }

  /**
   * Report a bug
   */
  private async reportBug() {
    const alert = await this.alertController.create({
      header: 'Report Bug',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Brief description'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Detailed description and steps to reproduce'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit',
          handler: (data) => {
            this.submitBugReport(data.title, data.description);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Submit bug report
   */
  private async submitBugReport(title: string, description: string) {
    if (!title || !description) {
      await this.showToast('Please fill in all fields', 'warning');
      return;
    }

    try {
      // TODO: Integrate with bug tracking system (e.g., Firebase Firestore or external API)
      console.log('Bug report:', { title, description });
      
      // For now, send via email
      const subject = encodeURIComponent(`[BUG] ${title}`);
      const body = encodeURIComponent(
        `${description}\n\n` +
        `---\n` +
        `App Version: ${environment.app.version}\n` +
        `Platform: ${this.getPlatform()}\n` +
        `Timestamp: ${new Date().toISOString()}\n`
      );
      
      window.location.href = `mailto:${this.supportEmail}?subject=${subject}&body=${body}`;
      
      await this.showToast('Thank you for your feedback!', 'success');
    } catch (error) {
      console.error('Error submitting bug report:', error);
      await this.showToast('Failed to submit bug report', 'danger');
    }
  }

  /**
   * Get platform info
   */
  private getPlatform(): string {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      return 'Android';
    }
    if (/iPad|iPhone|iPod/.test(ua)) {
      return 'iOS';
    }
    return 'Web';
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
