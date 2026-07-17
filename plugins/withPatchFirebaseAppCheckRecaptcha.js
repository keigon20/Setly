const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// FirebaseAppCheck/Sources/RecaptchaProvider/FIRRecaptchaProvider.m references
// AppCheckCore's Swift class GACRecaptchaProvider. CocoaPods never publishes a
// Swift pod's generated Objective-C header to a *different* pod's plain
// static-library target (that header doesn't exist until the Swift pod's own
// compile step runs, well after `pod install` builds the static-lib header
// symlink farm), so this fails to compile under this project's non-frameworks
// setup. Switching to use_frameworks! does fix that specific include, but
// then cascades into "non-modular include" errors across RN's own core pods,
// which aren't ours to patch (they live in react-native's own Podfile
// template).
//
// This app never uses Firebase's reCAPTCHA App Check provider (it configures
// appAttestWithDeviceCheckFallback via ReactNativeFirebaseAppCheckProvider,
// see src/utils/firebase.ts, and never sets FirebaseOptions.recaptchaSiteKey),
// and FIRDefaultProviderFactory only reaches this code path when a
// recaptchaSiteKey is present. So instead of fighting the build system to
// make unused code compile, patch it out: both GACRecaptchaProvider call
// sites become inert (isSupported always false; the concrete instance is
// never constructed) without touching any pod/build settings.
const IS_SUPPORTED_OLD = 'return [GACRecaptchaProvider isSupported];';
const IS_SUPPORTED_NEW = 'return NO; // patched by withPatchFirebaseAppCheckRecaptcha';

const INIT_OLD = `GACRecaptchaProvider *recaptchaProvider =
      [[GACRecaptchaProvider alloc] initWithSiteKey:siteKey
                                       resourceName:app.resourceName
                                             APIKey:app.options.APIKey
                                       requestHooks:heartbeatHook ? @[ heartbeatHook ] : @[]];`;
const INIT_NEW = 'id<GACAppCheckProvider> recaptchaProvider = nil; // patched by withPatchFirebaseAppCheckRecaptcha';

const withPatchFirebaseAppCheckRecaptcha = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      const marker = '# withPatchFirebaseAppCheckRecaptcha';
      if (!contents.includes(marker)) {
        const anchor = 'post_install do |installer|';
        const anchorIndex = contents.indexOf(anchor);
        if (anchorIndex === -1) {
          throw new Error(
            'withPatchFirebaseAppCheckRecaptcha: could not find `post_install do |installer|` in Podfile'
          );
        }
        const insertAt = anchorIndex + anchor.length;
        const injected = `
    ${marker}
    recaptcha_provider_path = File.join(installer.sandbox.pod_dir('FirebaseAppCheck'), 'FirebaseAppCheck', 'Sources', 'RecaptchaProvider', 'FIRRecaptchaProvider.m')
    if File.exist?(recaptcha_provider_path)
      content = File.read(recaptcha_provider_path)
      already_patched = content.include?(${JSON.stringify(IS_SUPPORTED_NEW)}) && content.include?(${JSON.stringify(INIT_NEW)})
      unless already_patched
        patched = content.sub(
          ${JSON.stringify(IS_SUPPORTED_OLD)},
          ${JSON.stringify(IS_SUPPORTED_NEW)}
        )
        patched = patched.sub(
          ${JSON.stringify(INIT_OLD)},
          ${JSON.stringify(INIT_NEW)}
        )
        if patched == content
          raise "withPatchFirebaseAppCheckRecaptcha: expected text not found in \#{recaptcha_provider_path} - FirebaseAppCheck source may have changed upstream, update plugins/withPatchFirebaseAppCheckRecaptcha.js"
        end
        File.write(recaptcha_provider_path, patched)
      end
    end
`;
        contents = contents.slice(0, insertAt) + injected + contents.slice(insertAt);
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};

module.exports = withPatchFirebaseAppCheckRecaptcha;
