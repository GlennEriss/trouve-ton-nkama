// No unconfigured Meta native initialization in builds where Facebook is disabled.
module.exports = {
  dependencies: process.env.EXPO_PUBLIC_FACEBOOK_LINKING_ENABLED === 'true'
    ? {}
    : { 'react-native-fbsdk-next': { platforms: { android: null, ios: null } } },
};
