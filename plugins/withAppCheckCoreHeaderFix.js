const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// FirebaseAppCheck's FIRRecaptchaProvider.m needs AppCheckCore's Swift-generated
// header (for GACRecaptchaProvider) via __has_include("AppCheckCore-Swift.h").
// Without use_frameworks!, CocoaPods never publishes that header into
// Pods/Headers/Public/AppCheckCore (it doesn't exist yet at `pod install` time,
// only after AppCheckCore's own Swift compile step), so the include silently
// fails and the class is "unknown" at compile time. Point FirebaseAppCheck's
// header search path directly at AppCheckCore's build output instead.
const MARKER = '# withAppCheckCoreHeaderFix';

const withAppCheckCoreHeaderFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      if (!contents.includes(MARKER)) {
        // CocoaPods only allows a single `post_install` hook per Podfile, so
        // this must be spliced into the existing one (added by the CNG
        // template for react_native_post_install) rather than appended as
        // its own block.
        const anchor = 'post_install do |installer|';
        const anchorIndex = contents.indexOf(anchor);
        if (anchorIndex === -1) {
          throw new Error('withAppCheckCoreHeaderFix: could not find `post_install do |installer|` in Podfile');
        }
        const insertAt = anchorIndex + anchor.length;
        const injected = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'FirebaseAppCheck'
      target.build_configurations.each do |build_config|
        search_paths = build_config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
        search_paths = [search_paths] if search_paths.is_a?(String)
        search_paths << '$(PODS_BUILD_DIR)/../Intermediates.noindex/Pods.build/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/AppCheckCore.build/DerivedSources'
        build_config.build_settings['HEADER_SEARCH_PATHS'] = search_paths
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

module.exports = withAppCheckCoreHeaderFix;
