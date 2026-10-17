// Public Meta client configuration only. NEVER read FACEBOOK_CLIENT_SECRET here.
module.exports = ({ config }) => {
  const appID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const clientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;
  const enabled = process.env.EXPO_PUBLIC_FACEBOOK_LINKING_ENABLED === 'true';
  if (enabled && (!appID || !clientToken)) throw new Error('Facebook requires EXPO_PUBLIC_FACEBOOK_APP_ID and EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN.');
  return {
    ...config,
    plugins: [...(config.plugins || []), ...(enabled ? [['react-native-fbsdk-next', {
      appID, clientToken, displayName: 'Trouve Ton Nkama', scheme: `fb${appID}`,
      advertiserIDCollectionEnabled: false, autoLogAppEventsEnabled: false, isAutoInitEnabled: false,
    }]] : [])],
  };
};
