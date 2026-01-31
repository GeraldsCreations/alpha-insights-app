import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, QueryConstraint, onSnapshot, Unsubscribe, DocumentData, Query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  /**
   * Get a single document
   */
  getDocument<T>(path: string): Observable<T | null> {
    return new Observable(observer => {
      const docRef = doc(this.firestore, path);
      
      getDoc(docRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            observer.next({ id: docSnap.id, ...docSnap.data() } as T);
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
            items.push({ id: doc.id, ...doc.data() } as T);
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
            items.push({ id: doc.id, ...doc.data() } as T);
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
  async updateDocument<T>(path: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.firestore, path);
      await updateDoc(docRef, data as DocumentData);
    } catch (error: any) {
      throw new Error(error.message);
    }
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
