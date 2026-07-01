import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is not in types but available at runtime
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VARIANT } from '../config/env';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import {
  ReactNativeFirebaseAppCheckProvider,
  initializeAppCheck as rnfbInitAppCheck,
  getToken as rnfbGetToken,
} from '@react-native-firebase/app-check';
import { getApp as getRnfbApp } from '@react-native-firebase/app';


// Firebase configuration - from Firebase Console
// TODO: staging currently points at the same project as production. Once a
// dedicated staging Firebase project is provisioned, replace these values
// (and re-point GoogleSignin's webClientId in AuthContext.tsx) so staging
// data never touches production.
const firebaseConfigs = {
  production: {
    apiKey: "AIzaSyB-RsH8ZtmTSgX5JbSyXrVdrYZ-I2_Cb4o",
    authDomain: "livemusictracker-6eeaf.firebaseapp.com",
    projectId: "livemusictracker-6eeaf",
    storageBucket: "livemusictracker-6eeaf.firebasestorage.app",
    messagingSenderId: "1077269817537",
    appId: "1:1077269817537:web:e09774dda09e5e4a85cc40"
  },
  staging: {
    apiKey: "AIzaSyB-RsH8ZtmTSgX5JbSyXrVdrYZ-I2_Cb4o",
    authDomain: "livemusictracker-6eeaf.firebaseapp.com",
    projectId: "livemusictracker-6eeaf",
    storageBucket: "livemusictracker-6eeaf.firebasestorage.app",
    messagingSenderId: "1077269817537",
    appId: "1:1077269817537:web:e09774dda09e5e4a85cc40"
  },
};

const firebaseConfig = firebaseConfigs[APP_VARIANT];

// Initialize Firebase
const isFirstInit = !getApps().length;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

if (isFirstInit) {
  // ReactNativeFirebaseAppCheckProvider.getToken() is not callable from JS —
  // the native module handles token retrieval. The correct bridge is to use
  // RNFB's own initializeAppCheck + modular getToken, then forward to the JS SDK.
  (async () => {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    // In debug builds: use 'debug' provider. If EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN
    // is set, RNFB uses it; otherwise it logs a token to logcat on first run —
    // copy it into Firebase console → App Check → debug tokens, then add to .env.
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
      },
    });

    const rnfbInstance = await rnfbInitAppCheck(getRnfbApp(), {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token } = await rnfbGetToken(rnfbInstance, false);
          return { token, expireTimeMillis: Date.now() + 3600000 };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });
  })();
}
// Initialize Firebase services with AsyncStorage persistence for React Native
// Using ts-ignore because the RN-specific types are not exported in the main firebase package
// @ts-ignore
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { auth };
// useFetchStreams isn't in the public FirestoreSettings type for this SDK version,
// but RN's fetch lacks streaming support so it must be disabled for long-polling to work.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
  ignoreUndefinedProperties: true,
} as any);

export const storage = getStorage(app);

export default app;

