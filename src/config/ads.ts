import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import { APP_VARIANT } from './env';

// AdMob ad units are tied to a specific per-platform app, so the unit ID
// itself is platform-specific too, not just the AdMob app ID.
const NATIVE_AD_UNIT_IDS = {
  android: 'ca-app-pub-1590191309979352/1893322708',
  ios: 'ca-app-pub-1590191309979352/7182770847',
};

// Use test IDs in staging/dev so ads always fill on emulators and dev devices
// without risking policy violations from clicking your own production ads.
// Switch to the real unit ID only in production builds.
export const NATIVE_AD_UNIT_ID =
  APP_VARIANT === 'production'
    ? NATIVE_AD_UNIT_IDS[Platform.OS === 'ios' ? 'ios' : 'android']
    : TestIds.NATIVE;
