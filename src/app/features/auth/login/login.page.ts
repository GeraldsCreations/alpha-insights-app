import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle login form submission
   */
  async login() {
    if (!this.email || !this.password) {
      this.showToast('Please enter both email and password', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Signing in...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      await this.authService.signIn(this.email, this.password);
      await loading.dismiss();
      
      this.showToast('Welcome back! 🎉', 'success');
      this.router.navigate(['/home']);
      
    } catch (error: any) {
      await loading.dismiss();
      
      // Handle Firebase-specific errors
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.includes('user-not-found') || error.message.includes('wrong-password')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address format.';
      } else if (error.message.includes('too-many-requests')) {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('invalid-credential')) {
        errorMessage = 'Invalid credentials. Please check your email and password.';
      }
      
      this.showToast(errorMessage, 'danger');
      console.error('Login error:', error);
    }
  }

  /**
   * Navigate to registration page
   */
  goToRegister() {
    this.router.navigate(['/register']);
  }

  /**
   * Show forgot password dialog
   */
  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Reset Password',
      message: 'Enter your email address and we\'ll send you a password reset link.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Enter your email',
          value: this.email // Pre-fill with email if already entered
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send Reset Link',
          handler: async (data) => {
            if (!data.email) {
              this.showToast('Please enter your email address', 'warning');
              return false;
            }
            
            await this.sendPasswordReset(data.email);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Send password reset email
   */
  private async sendPasswordReset(email: string) {
    const loading = await this.loadingController.create({
      message: 'Sending reset link...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      await this.authService.resetPassword(email);
      await loading.dismiss();
      
      this.showToast(
        `Password reset link sent to ${email}. Check your inbox! 📧`,
        'success',
        4000
      );
      
    } catch (error: any) {
      await loading.dismiss();
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.message.includes('user-not-found')) {
        errorMessage = 'No account found with this email address.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address format.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      this.showToast(errorMessage, 'danger');
      console.error('Password reset error:', error);
    }
  }

  /**
   * Show toast notification
   */
  private async showToast(
    message: string, 
    color: 'success' | 'danger' | 'warning', 
    duration: number = 3000
  ) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}
