// Sign in with Apple needs the paid Apple Developer Program: with a free Apple ID the build would fail.
// It is switched on only with APPLE_SIGN_IN=1 (set it in eas.json or before `npm run ios:telefono`).
module.exports = ({ config }) => {
  if (process.env.APPLE_SIGN_IN === '1') return config;
  return {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: false },
    plugins: config.plugins.filter(p => p !== 'expo-apple-authentication'),
  };
};
