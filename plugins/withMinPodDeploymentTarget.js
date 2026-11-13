const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Xcode 27 rejects any target whose IPHONEOS_DEPLOYMENT_TARGET is below 15.0
// (a hard error, no longer just a warning). Several pods — mostly resource/privacy
// bundle targets from Google/Firebase SDKs and RNCAsyncStorage — still declare
// 9.0–13.4. Raise every pod target below the minimum up to it.
const MIN_IOS = '15.1';

const withMinPodDeploymentTarget = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      const marker = '# withMinPodDeploymentTarget';
      if (!contents.includes(marker)) {
        const anchor = 'post_install do |installer|';
        const anchorIndex = contents.indexOf(anchor);
        if (anchorIndex === -1) {
          throw new Error('withMinPodDeploymentTarget: could not find `post_install do |installer|` in Podfile');
        }
        const insertAt = anchorIndex + anchor.length;
        const injected = `
    ${marker}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_IOS}')
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}'
        end
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

module.exports = withMinPodDeploymentTarget;
