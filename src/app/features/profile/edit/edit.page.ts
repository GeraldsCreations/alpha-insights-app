import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { 
  updateProfile, 
  updateEmail, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from '@angular/fire/auth';
import { doc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
})
export class EditPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  currentUser: any = null;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private firestore: Firestore,
    private auth: Auth,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.editForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      photoURL: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  ngOnInit() {
    this.loadCurrentUser();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load current user data
   */
  loadCurrentUser() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.editForm.patchValue({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || ''
          });
        }
      });
  }

  /**
   * Submit form
   */
  async onSubmit() {
    if (this.editForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Updating profile...'
    });
    await loading.present();

    try {
      const { displayName, email, photoURL } = this.editForm.value;
      const currentEmail = this.currentUser.email;

      // Update display name and photo URL in Firebase Auth
      if (this.auth.currentUser) {
        await updateProfile(this.auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoURL.trim() || undefined
        });
      }

      // Update email if changed
      if (email !== currentEmail) {
        await this.updateEmailWithReauth(email);
      }

      // Update Firestore user document
      const userRef = doc(this.firestore, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        photoURL: photoURL.trim() || null,
        email: email.toLowerCase().trim()
      });

      await loading.dismiss();
      this.showToast('Profile updated successfully');
      this.router.navigate(['/profile']);
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error updating profile:', error);
      
      let message = 'Failed to update profile';
      if (error.code === 'auth/requires-recent-login') {
        message = 'Please logout and login again to change your email';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Email already in use';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      }
      
      this.showToast(message, 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Update email with reauthentication
   */
  private async updateEmailWithReauth(newEmail: string) {
    if (!this.auth.currentUser) {
      throw new Error('No authenticated user');
    }

    const alert = await this.alertController.create({
      header: 'Confirm Password',
      message: 'Please enter your password to change email',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Password'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            throw new Error('Email change cancelled');
          }
        },
        {
          text: 'Confirm',
          handler: async (data) => {
            if (!data.password) {
              this.showToast('Password required', 'danger');
              return false;
            }

            try {
              // Reauthenticate
              const credential = EmailAuthProvider.credential(
                this.currentUser.email,
                data.password
              );
              await reauthenticateWithCredential(this.auth.currentUser!, credential);

              // Update email
              await updateEmail(this.auth.currentUser!, newEmail);
              return true;
            } catch (error: any) {
              console.error('Reauthentication error:', error);
              
              let message = 'Authentication failed';
              if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password';
              } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many attempts. Try again later.';
              }
              
              this.showToast(message, 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    
    if (role === 'cancel') {
      throw new Error('Email change cancelled');
    }
  }

  /**
   * Upload photo (placeholder for future implementation)
   */
  async uploadPhoto() {
    const alert = await this.alertController.create({
      header: 'Upload Photo',
      message: 'Photo upload feature coming soon! For now, you can paste an image URL.',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Remove photo
   */
  async removePhoto() {
    this.editForm.patchValue({ photoURL: '' });
  }

  /**
   * Cancel edit
   */
  cancel() {
    this.router.navigate(['/profile']);
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

  /**
   * Get form control
   */
  get f() {
    return this.editForm.controls;
  }
}
