import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDVayDFRhnIiCgRwLvLPKf2nhd8AaULaF0",
  authDomain: "setly-59268.firebaseapp.com",
  projectId: "setly-59268",
  storageBucket: "setly-59268.firebasestorage.app",
  messagingSenderId: "447661547607",
  appId: "1:447661547607:web:159a0271caf9f6d89a8312",
  measurementId: "G-5WLV43V4RW",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
