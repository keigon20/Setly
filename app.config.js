const { withProjectBuildGradle } = require('@expo/config-plugins');
const withAppCheckCoreHeaderFix = require('./plugins/withAppCheckCoreHeaderFix');

const APP_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging' ? 'staging' : 'production';
const isStaging = APP_VARIANT === 'staging';

// Android and iOS identifiers are tracked separately (rather than derived
// from one shared base) because each platform's namespace is independent -
// "com.setly.app" was already taken on Play Store, so the Android production
// id had to change to "com.setlyapp.android" without touching the iOS one,
// and staging (already registered in Firebase for Google Sign-In) stays put.
const ANDROID_PACKAGE = isStaging ? 'com.setly.app.staging' : 'com.setlyapp.android';
const IOS_BUNDLE_ID = isStaging ? 'com.setly.app.staging' : 'com.setly.app';

// play-services-ads 25.x ships Kotlin 2.3.0 metadata; the EAS Kotlin 2.1.x
// compiler rejects it. The compiler version is controlled internally by
// expo-root-project and cannot be overridden via config. Instead, tell the
// compiler to skip the metadata version check so it can link the JARs anyway.
const withKotlinMetadataSkip = (config) => {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes('Xskip-metadata-version-check')) return mod;
    mod.modResults.contents += `
// play-services-ads 25.x metadata-version workaround
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      freeCompilerArgs += ["-Xskip-metadata-version-check"]
    }
  }
}
`;
    return mod;
  });
};

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
      googleServicesFile: isStaging
        ? './GoogleService-Info.plist'
        : './GoogleService-Info.production.plist',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      googleServicesFile: isStaging
        ? './google-services.json'
        : './google-services.production.json',
      package: ANDROID_PACKAGE,
      versionCode: 11,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundColor: '#F5EEE6',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      withKotlinMetadataSkip,
      withAppCheckCoreHeaderFix,
      '@react-native-community/datetimepicker',
      'expo-sharing',
      'expo-web-browser',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          backgroundColor: '#0B0B0C',
        },
      ],
      '@react-native-firebase/app',
      'expo-apple-authentication',
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
              { name: 'AppCheckCore', version: '11.3.0', modular_headers: true },
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
