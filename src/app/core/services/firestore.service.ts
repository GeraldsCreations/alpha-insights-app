import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, QueryConstraint, onSnapshot, Unsubscribe, DocumentData, Query, setDoc, increment, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

/**
 * Convert Firebase Timestamp objects to JavaScript Date objects
 */
function convertTimestamps(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  // Handle Timestamp objects
  if (data instanceof Timestamp) {
    return data.toDate();
  }

  // Handle nested objects
  const converted: any = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      if (value instanceof Timestamp) {
        converted[key] = value.toDate();
      } else if (value && typeof value === 'object') {
        converted[key] = convertTimestamps(value);
      } else {
        converted[key] = value;
      }
    }
  }
  
  return converted;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  /**
   * Set a document (create or overwrite)
   */
  async setDocument<T>(path: string, data: T, merge: boolean = false): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      await setDoc(docRef, data as DocumentData, { merge });
    } catch (error: any) {
      console.error('Firestore setDocument error:', error);
      throw new Error(error.message || 'Failed to set document');
    }
  }

  /**
   * Get a single document
   */
  getDocument<T>(path: string): Observable<T | null> {
    return new Observable(observer => {
      const docRef = doc(this.firestore, path);
      
      getDoc(docRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = convertTimestamps(docSnap.data());
            observer.next({ id: docSnap.id, ...data } as T);
          } else {
            observer.next(null);
          }
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Get a collection with optional query constraints
   */
  getCollection<T>(path: string, ...queryConstraints: QueryConstraint[]): Observable<T[]> {
    return new Observable(observer => {
      const collectionRef = collection(this.firestore, path);
      const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
      
      getDocs(q)
        .then(querySnapshot => {
          const items: T[] = [];
          querySnapshot.forEach(doc => {
            const data = convertTimestamps(doc.data());
            items.push({ id: doc.id, ...data } as T);
          });
          observer.next(items);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Listen to real-time updates on a collection
   */
  streamCollection<T>(path: string, ...queryConstraints: QueryConstraint[]): Observable<T[]> {
    return new Observable(observer => {
      const collectionRef = collection(this.firestore, path);
      const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
      
      const unsubscribe = onSnapshot(q, 
        querySnapshot => {
          const items: T[] = [];
          querySnapshot.forEach(doc => {
            const data = convertTimestamps(doc.data());
            items.push({ id: doc.id, ...data } as T);
          });
          observer.next(items);
        },
        error => observer.error(error)
      );
      
      return () => unsubscribe();
    });
  }

  /**
   * Add a new document to a collection
   */
  async addDocument<T>(path: string, data: T): Promise<string> {
    try {
      const collectionRef = collection(this.firestore, path);
      const docRef = await addDoc(collectionRef, data as DocumentData);
      return docRef.id;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  /**
   * Update an existing document
   */
  updateDocument<T>(path: string, data: Partial<T>): Observable<void> {
    return new Observable(observer => {
      const docRef = doc(this.firestore, path);
      updateDoc(docRef, data as DocumentData)
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Firestore increment helper
   */
  increment(value: number): any {
    return increment(value);
  }

  /**
   * Firestore serverTimestamp helper
   */
  serverTimestamp(): any {
    return serverTimestamp();
  }

  /**
   * Delete a document
   */
  async deleteDocument(path: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      await deleteDoc(docRef);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
