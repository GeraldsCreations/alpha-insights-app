import { Injectable } from '@angular/core';
import { 
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot
} from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UploadProgress {
  progress: number; // 0-100
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

/**
 * Storage Service
 * 
 * Handles file uploads to Firebase Storage
 * - Profile photos
 * - Report attachments
 * - User content
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly MAX_FILE_SIZE = environment.app.maxImageSizeMB * 1024 * 1024; // Convert MB to bytes
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  constructor(
    private storage: Storage,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  /**
   * Upload profile photo
   */
  uploadProfilePhoto(file: File): Observable<string> {
    return new Observable(observer => {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        observer.error(new Error('User must be authenticated'));
        return;
      }

      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        observer.error(new Error(validation.error));
        return;
      }

      // Create storage reference
      const filePath = `users/${currentUser.uid}/profile-photo.jpg`;
      const storageRef = ref(this.storage, filePath);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      });

      // Monitor upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          console.error('Upload error:', error);
          observer.error(error);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update user document with new photo URL
            const userRef = doc(this.firestore, `users/${currentUser.uid}`);
            await updateDoc(userRef, {
              photoURL: downloadURL,
              photoUpdatedAt: new Date()
            });

            observer.next(downloadURL);
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        }
      );
    });
  }

  /**
   * Upload profile photo with progress tracking
   */
  uploadProfilePhotoWithProgress(file: File): {
    upload$: Observable<string>;
    progress$: Observable<UploadProgress>;
  } {
    const progressSubject = new Subject<UploadProgress>();
    
    const upload$ = new Observable<string>(observer => {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        observer.error(new Error('User must be authenticated'));
        return;
      }

      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        observer.error(new Error(validation.error));
        return;
      }

      // Create storage reference
      const filePath = `users/${currentUser.uid}/profile-photo.jpg`;
      const storageRef = ref(this.storage, filePath);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type
      });

      // Monitor upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          
          progressSubject.next({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state as any
          });
        },
        (error) => {
          progressSubject.error(error);
          observer.error(error);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update user document
            const userRef = doc(this.firestore, `users/${currentUser.uid}`);
            await updateDoc(userRef, {
              photoURL: downloadURL,
              photoUpdatedAt: new Date()
            });

            progressSubject.next({
              progress: 100,
              bytesTransferred: file.size,
              totalBytes: file.size,
              state: 'success'
            });

            progressSubject.complete();
            observer.next(downloadURL);
            observer.complete();
          } catch (error) {
            progressSubject.error(error);
            observer.error(error);
          }
        }
      );
    });

    return {
      upload$,
      progress$: progressSubject.asObservable()
    };
  }

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const filePath = `users/${currentUser.uid}/profile-photo.jpg`;
    const storageRef = ref(this.storage, filePath);

    try {
      await deleteObject(storageRef);

      // Update user document to remove photo URL
      const userRef = doc(this.firestore, `users/${currentUser.uid}`);
      await updateDoc(userRef, {
        photoURL: null,
        photoUpdatedAt: new Date()
      });
    } catch (error: any) {
      // If file doesn't exist, just update the user document
      if (error.code === 'storage/object-not-found') {
        const userRef = doc(this.firestore, `users/${currentUser.uid}`);
        await updateDoc(userRef, {
          photoURL: null
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`
      };
    }

    return { valid: true };
  }

  /**
   * Compress image before upload (optional enhancement)
   */
  async compressImage(file: File, maxWidth: number = 800): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Could not compress image'));
              }
            },
            'image/jpeg',
            0.9
          );
        };

        img.onerror = () => reject(new Error('Could not load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload with compression
   */
  async uploadProfilePhotoCompressed(file: File): Promise<string> {
    const compressed = await this.compressImage(file);
    const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });
    
    return this.uploadProfilePhoto(compressedFile).toPromise() as Promise<string>;
  }
}
