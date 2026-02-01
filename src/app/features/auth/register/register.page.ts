import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { FirestoreService } from '../../../core/services/firestore.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  /**
   * Handle registration form submission
   */
  async onRegister() {
    if (this.registerForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'warning');
      return;
    }

    const { email, password, displayName } = this.registerForm.value;
    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      // Create auth user
      await this.authService.signUp(email, password, displayName);

      // Get the newly created user
      const user = this.authService.getCurrentUser();

      if (user) {
        // Create user document in Firestore
        await this.firestoreService.setDocument(`users/${user.uid}`, {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          photoURL: null,
          createdAt: new Date(),
          notificationPreferences: {
            highConfidence: true
          }
        });
      }

      await loading.dismiss();
      
      this.showToast('Account created successfully! Welcome to Alpha Insights 🎉', 'success');
      
      // Navigate to home
      this.router.navigate(['/home']);
      
    } catch (error: any) {
      await loading.dismiss();
      
      // Handle Firebase-specific errors
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Try logging in instead.';
      } else if (error.message.includes('weak-password')) {
        errorMessage = 'Password is too weak. Use at least 6 characters.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address format.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      this.showToast(errorMessage, 'danger');
      console.error('Registration error:', error);
    }
  }

  /**
   * Navigate to login page
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  /**
   * Get error message for form field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `Must be at least ${minLength} characters`;
    }
    
    return '';
  }
}
