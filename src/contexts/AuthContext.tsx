import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { UserProfile } from '../types';
import { APP_VARIANT } from '../config/env';
import { deleteAllUserData } from '../utils/deleteAccount';

// TODO: once a dedicated staging Firebase project exists, register a separate
// OAuth client for the staging package name (com.setly.app.staging) and use
// its web client ID here instead of reusing the production one.
const GOOGLE_WEB_CLIENT_IDS = {
  production: '1077269817537-og56f8jtikapoj531kafcf431sc5u7in.apps.googleusercontent.com',
  staging: '1077269817537-og56f8jtikapoj531kafcf431sc5u7in.apps.googleusercontent.com',
};

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_IDS[APP_VARIANT],
});

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  sendVerificationEmail: () => Promise<boolean>;
  refreshEmailVerified: () => Promise<boolean>;
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

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged fired, uid:', firebaseUser?.uid ?? null);
      setFirebaseUser(firebaseUser);
      setIsEmailVerified(firebaseUser?.emailVerified ?? false);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          console.log('[Auth] forced token refresh, expiration:', tokenResult.expirationTime);

          const [userDoc, adminDoc] = await Promise.all([
            getDoc(doc(db, 'users', firebaseUser.uid)),
            getDoc(doc(db, 'admins', firebaseUser.uid)),
          ]);
          setIsAdmin(adminDoc.exists());

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const resolvedUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || '',
              createdAt: userData.createdAt?.toDate() || new Date()
            };
            setUser(resolvedUser);
          } else {
            // Create user profile if doesn't exist
            const newUser: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              createdAt: new Date()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUser,
              createdAt: new Date()
            });
            setUser(newUser);
          }
        } catch (err: any) {
          console.error('[Auth] Error fetching user profile:', err?.code, err?.message, err);
        }
      } else {
        console.log('[Auth] setUser(null)');
        setUser(null);
        setIsAdmin(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // While signed in but not yet verified, pick up the verification as soon as
  // the user comes back to the app (they verify via a link in their email,
  // opened outside the app) instead of requiring a manual refresh tap.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.emailVerified) return;
      try {
        await currentUser.reload();
        setIsEmailVerified(currentUser.emailVerified);
      } catch (err) {
        console.error('[Auth] Failed to refresh email verification status:', err);
      }
    });

    return () => subscription.remove();
  }, []);

  const signUp = async (email: string, password: string, displayName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      // Don't block account creation on this - it's a nice-to-have nudge,
      // not a requirement to use the app.
      sendEmailVerification(userCredential.user).catch(err => {
        console.error('[Auth] Failed to send verification email:', err);
      });

      // Create user profile in Firestore
      const newUser: UserProfile = {
        id: userCredential.user.uid,
        email,
        displayName,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        ...newUser,
        createdAt: new Date()
      });

      setUser(newUser);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      // Check for missing initial state error and provide helpful message
      if (isMissingInitialStateError(err)) {
        setError('Unable to complete sign up. Please try again. If this persists, try closing and reopening the app.');
      } else {
        setError(mapFirebaseError(err.code));
      }
      setIsLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      // Check for missing initial state error and provide helpful message
      if (isMissingInitialStateError(err)) {
        setError('Unable to complete sign in. Please try again. If this persists, try closing and reopening the app.');
      } else {
        setError(mapFirebaseError(err.code));
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
    }
    setIsLoading(false);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
      setIsLoading(false);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type !== 'success') {
        return false;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('No Google token received (idToken missing)');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      return true;
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return false;
      }
      console.error('Google Sign-In error:', err);
      setError(mapFirebaseError(err.code) || err.message || 'Failed to sign in with Google');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDisplayName = async (displayName: string): Promise<boolean> => {
    const trimmed = displayName.trim();
    if (!trimmed || !firebaseUser || !user) return false;

    setError(null);
    try {
      await updateProfile(firebaseUser, { displayName: trimmed });
      await setDoc(doc(db, 'users', firebaseUser.uid), { displayName: trimmed }, { merge: true });
      setUser(prev => prev ? { ...prev, displayName: trimmed } : prev);
      return true;
    } catch (err: any) {
      setError(mapFirebaseError(err.code) || 'Failed to update name');
      return false;
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; message?: string }> => {
    if (!firebaseUser || !user) return { success: false, message: 'Not signed in.' };

    setError(null);
    try {
      await deleteAllUserData(user.id);
      await deleteUser(firebaseUser);
      setUser(null);
      setFirebaseUser(null);
      return { success: true };
    } catch (err: any) {
      console.error('[Auth] Failed to delete account:', err?.code, err?.message, err);
      const message = err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign back in, then try deleting your account again.'
        : (mapFirebaseError(err.code) || err?.message || 'Failed to delete account');
      setError(message);
      return { success: false, message };
    }
  };

  const sendVerificationEmail = async (): Promise<boolean> => {
    if (!firebaseUser) return false;

    setError(null);
    try {
      await sendEmailVerification(firebaseUser);
      return true;
    } catch (err: any) {
      setError(mapFirebaseError(err.code) || 'Failed to send verification email');
      return false;
    }
  };

  const refreshEmailVerified = async (): Promise<boolean> => {
    if (!firebaseUser) return false;

    try {
      await firebaseUser.reload();
      setIsEmailVerified(firebaseUser.emailVerified);
      return firebaseUser.emailVerified;
    } catch (err: any) {
      console.error('[Auth] Failed to refresh email verification status:', err);
      return isEmailVerified;
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    firebaseUser,
    isEmailVerified,
    isLoading,
    isAdmin,
    isAuthenticated: !!user,
    error,
    signUp,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
    updateDisplayName,
    deleteAccount,
    sendVerificationEmail,
    refreshEmailVerified,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
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
    case 'auth/operation-not-allowed':
      return 'Operation not allowed';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/user-disabled':
      return 'This account has been disabled';
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
    case 'auth/session-cookie-expired':
      return 'Session expired. Please sign in again';
    case 'auth/user-token-expired':
      return 'Your session has expired. Please sign in again';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action';
    default:
      return 'An error occurred. Please try again';
  }
}

// Helper function to detect "missing initial state" error
// This error occurs when sessionStorage is unavailable or was cleared
function isMissingInitialStateError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  
  // Check for various forms of this error
  return (
    errorMessage.includes('missing initial state') ||
    errorMessage.includes('Unable to process request due to missing initial state') ||
    errorCode === 'auth/internal-error' ||
    errorCode === 'auth/session-cookie-expired' ||
    errorCode === 'auth/user-token-expired'
  );
}


