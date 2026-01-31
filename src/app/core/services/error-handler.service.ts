import { Injectable } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';

export interface AppError {
  code: string;
  message: string;
  originalError?: any;
  userMessage: string;
  canRetry: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private readonly ERROR_MESSAGES: { [key: string]: string } = {
    // Network errors
    'network-request-failed': 'Network error. Please check your internet connection.',
    'unavailable': 'Service temporarily unavailable. Please try again.',
    'timeout': 'Request timed out. Please try again.',
    
    // Firebase Auth errors
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Invalid email address format.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This operation is not allowed.',
    'auth/invalid-credential': 'Invalid login credentials.',
    
    // Firestore errors
    'permission-denied': 'You don\'t have permission to access this data.',
    'not-found': 'The requested data was not found.',
    'already-exists': 'This item already exists.',
    'resource-exhausted': 'Quota exceeded. Please try again later.',
    'failed-precondition': 'Operation failed due to system state.',
    'aborted': 'Operation was aborted. Please try again.',
    'out-of-range': 'Operation out of valid range.',
    'unimplemented': 'This feature is not yet implemented.',
    'internal': 'Internal server error. Please contact support.',
    'data-loss': 'Data loss detected. Please contact support.',
    'unauthenticated': 'Authentication required. Please log in.',
    
    // Storage errors
    'storage/unauthorized': 'You don\'t have permission to access this file.',
    'storage/canceled': 'Upload was canceled.',
    'storage/unknown': 'Unknown storage error occurred.',
    'storage/object-not-found': 'File not found.',
    'storage/bucket-not-found': 'Storage bucket not found.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated': 'Authentication required for storage access.',
    'storage/retry-limit-exceeded': 'Maximum retry limit exceeded.',
    
    // Default
    'unknown': 'An unexpected error occurred. Please try again.'
  };

  constructor(
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  /**
   * Parse and normalize error
   */
  parseError(error: any): AppError {
    let code = 'unknown';
    let message = '';
    let canRetry = true;

    if (error) {
      // Firebase errors
      if (error.code) {
        code = error.code;
      }
      
      // Network errors
      if (error.message?.includes('network') || 
          error.message?.includes('Failed to fetch')) {
        code = 'network-request-failed';
      }
      
      // Timeout errors
      if (error.message?.includes('timeout')) {
        code = 'timeout';
      }

      message = error.message || '';
    }

    const userMessage = this.ERROR_MESSAGES[code] || this.ERROR_MESSAGES['unknown'];
    
    // Determine if operation can be retried
    canRetry = this.canRetryOperation(code);

    return {
      code,
      message,
      originalError: error,
      userMessage,
      canRetry
    };
  }

  /**
   * Check if operation can be retried
   */
  private canRetryOperation(code: string): boolean {
    const nonRetryableCodes = [
      'permission-denied',
      'auth/user-disabled',
      'auth/invalid-email',
      'auth/email-already-in-use',
      'auth/weak-password',
      'not-found',
      'already-exists',
      'data-loss'
    ];

    return !nonRetryableCodes.includes(code);
  }

  /**
   * Show error toast
   */
  async showErrorToast(error: any, duration: number = 3000) {
    const parsedError = this.parseError(error);
    
    const toast = await this.toastController.create({
      message: parsedError.userMessage,
      duration,
      position: 'bottom',
      color: 'danger',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });

    await toast.present();
  }

  /**
   * Show error alert with retry option
   */
  async showErrorAlert(
    error: any,
    retryCallback?: () => void,
    title: string = 'Error'
  ) {
    const parsedError = this.parseError(error);
    
    const buttons: any[] = [
      {
        text: 'OK',
        role: 'cancel'
      }
    ];

    if (parsedError.canRetry && retryCallback) {
      buttons.push({
        text: 'Retry',
        handler: () => {
          retryCallback();
        }
      });
    }

    const alert = await this.alertController.create({
      header: title,
      message: parsedError.userMessage,
      buttons
    });

    await alert.present();
  }

  /**
   * Log error for debugging
   */
  logError(error: any, context: string = '') {
    const parsedError = this.parseError(error);
    
    console.error(`[${context}] Error:`, {
      code: parsedError.code,
      message: parsedError.message,
      userMessage: parsedError.userMessage,
      canRetry: parsedError.canRetry,
      timestamp: new Date().toISOString(),
      originalError: parsedError.originalError
    });
  }

  /**
   * Handle network errors specifically
   */
  isNetworkError(error: any): boolean {
    const parsedError = this.parseError(error);
    return parsedError.code === 'network-request-failed' || 
           parsedError.code === 'unavailable' ||
           parsedError.code === 'timeout';
  }

  /**
   * Handle authentication errors
   */
  isAuthError(error: any): boolean {
    const parsedError = this.parseError(error);
    return parsedError.code.startsWith('auth/') || 
           parsedError.code === 'unauthenticated';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: any): string {
    const parsedError = this.parseError(error);
    return parsedError.userMessage;
  }
}
