const { createRunOncePlugin } = require('expo/config-plugins');

// Sign in with Apple needs the paid Apple Developer Program: with a free Apple ID the build would fail.
// It is switched on only with APPLE_SIGN_IN=1 (set in eas.json, or before `npm run ios:telefono`).
//
// Removing the plugin from the list is not enough: Expo also applies the plugins of installed modules on its own.
// The plugin runs once per name, so a no-op registered under its name first keeps it from adding the capability.
const skipAppleSignIn = createRunOncePlugin(config => config, 'expo-apple-authentication', 'disattivato');

module.exports = ({ config }) => {
  if (process.env.APPLE_SIGN_IN === '1') return config;
  return {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: false },
    plugins: [skipAppleSignIn, ...config.plugins.filter(p => p !== 'expo-apple-authentication')],
  };
};
