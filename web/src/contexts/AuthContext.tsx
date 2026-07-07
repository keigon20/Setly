'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: data.displayName || fbUser.displayName || '',
              photoURL: data.photoURL || fbUser.photoURL || undefined,
              createdAt: data.createdAt?.toDate() || new Date(),
              isAdmin: data.isAdmin || false,
            });
          } else {
            const newUser: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || '',
              photoURL: fbUser.photoURL || undefined,
              createdAt: new Date(),
            };
            await setDoc(userDocRef, {
              displayName: newUser.displayName,
              email: newUser.email,
              photoURL: newUser.photoURL || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            setUser(newUser);
          }
        } catch (err) {
          console.error('[Auth] Error fetching user profile:', err);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      // Upsert user doc
      await setDoc(
        doc(db, 'users', fbUser.uid),
        {
          displayName: fbUser.displayName || '',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || null,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return true;
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return false;
      }
      setError(mapFirebaseError(err.code));
      return false;
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<boolean> => {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName,
        email,
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return true;
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        error,
        signInWithGoogle,
        signUp,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid credentials';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in. Please contact support';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups and try again';
    default:
      return 'An error occurred. Please try again';
  }
}
