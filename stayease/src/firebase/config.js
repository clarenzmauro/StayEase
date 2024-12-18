import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiii3HKZOuvvcYsEj_-GUprG5xFYwYpuU",
  authDomain: "stayease-ca1cb.firebaseapp.com",
  projectId: "stayease-ca1cb",
  storageBucket: "stayease-ca1cb.firebasestorage.app",
  messagingSenderId: "605023633613",
  appId: "1:605023633613:web:b65a062054b5b5fbbd2984"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
