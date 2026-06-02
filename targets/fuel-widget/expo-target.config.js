/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'fuel-widget',
  displayName: 'Fuel',
  // Keep >= the app's iOS minimum (15.1) and >= 16 for accessory (lock-screen)
  // families. Interactive App Intents are guarded to 17.0 in Swift.
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  // $widgetBackground/$accent are picked up by Xcode build settings; the live
  // tint + background come from the snapshot at render time. Mirrors src/theme.ts.
  colors: {
    $accent: { light: '#22D3A7', dark: '#22D3A7' },
    $widgetBackground: { light: '#EEF0FB', dark: '#0B0A1F' },
  },
  // App Group shared with the main app so both read/write the snapshot. The app
  // target gets the same group via app.json's ios.entitlements.
  entitlements: {
    'com.apple.security.application-groups': ['group.com.khalidalmohannadi.fuel'],
  },
});
