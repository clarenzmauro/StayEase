import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface Dormitory {
  id?: string;
  name: string;
  address: string;
  price: number;
  amenities: string[];
  contact: string;
  verified: boolean;
  images: string[];
}

const COLLECTION_NAME = 'dormitories';

export const dormitoryService = {
  async getAllDormitories(): Promise<Dormitory[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Dormitory));
  },

  async getDormitoryById(id: string): Promise<Dormitory | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Dormitory;
    }
    return null;
  },

  async getVerifiedDormitories(): Promise<Dormitory[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('verified', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Dormitory));
  },

  async addDormitory(dormitory: Omit<Dormitory, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dormitory);
    return docRef.id;
  },

  async updateDormitory(id: string, dormitory: Partial<Dormitory>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, dormitory);
  },

  async deleteDormitory(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
