const APP_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging' ? 'staging' : 'production';
const isStaging = APP_VARIANT === 'staging';

// Android and iOS identifiers are tracked separately (rather than derived
// from one shared base) because each platform's namespace is independent -
// "com.setly.app" was already taken on Play Store, so the Android production
// id had to change to "com.setlyapp.android" without touching the iOS one,
// and staging (already registered in Firebase for Google Sign-In) stays put.
const ANDROID_PACKAGE = isStaging ? 'com.setly.app.staging' : 'com.setlyapp.android';
const IOS_BUNDLE_ID = isStaging ? 'com.setly.app.staging' : 'com.setly.app';

module.exports = {
  expo: {
    name: isStaging ? 'Setly (Staging)' : 'Setly',
    slug: 'setly',
    owner: 'r2keigo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    scheme: 'livemusictracker',
    ios: {
      supportsTablet: true,
      bundleIdentifier: IOS_BUNDLE_ID,
      googleServicesFile: './GoogleService-Info.plist',
    },
    android: {
      googleServicesFile: './google-services.json',
      package: ANDROID_PACKAGE,
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          backgroundColor: '#0B0B0C',
        },
      ],
      '@react-native-firebase/app',
      'expo-image-picker',
      'expo-notifications',
      'expo-font',
      '@react-native-google-signin/google-signin',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-1590191309979352~8630955591',
          // TODO: replace with your real iOS AdMob App ID once you add an iOS
          // app in the AdMob console. Still Google's test ID for now since
          // you're Android-only at this stage.
          iosAppId: 'ca-app-pub-3940256099942544~1458002511',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            extraPods: [
              { name: 'GoogleUtilities', modular_headers: true },
              { name: 'RecaptchaInterop', modular_headers: true },
            ],
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'c883743b-5116-4a61-be11-e98b526fe00d',
      },
    },
  },
};
