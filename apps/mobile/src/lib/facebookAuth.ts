import { Platform } from 'react-native';
import { FacebookAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignInCancelledError } from './googleAuth';

// Explicitly opt in only after native configuration and a new build are ready.
export const facebookLinkingEnabled = process.env.EXPO_PUBLIC_FACEBOOK_LINKING_ENABLED === 'true'
  && Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID && process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN);

export async function requestFacebookCredential() {
  if (!facebookLinkingEnabled) throw new Error('Configuration Facebook native incomplète.');
  const { LoginManager, AccessToken, AuthenticationToken, Settings } = require('react-native-fbsdk-next') as typeof import('react-native-fbsdk-next');
  const { randomUUID, digestStringAsync, CryptoDigestAlgorithm } = require('expo-crypto') as typeof import('expo-crypto');
  Settings.initializeSDK();
  const nonce = randomUUID();
  const nonceHash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'limited', nonceHash);
  if (result.isCancelled) throw new GoogleSignInCancelledError();
  if (Platform.OS === 'ios') {
    const token = await AuthenticationToken.getAuthenticationTokenIOS();
    if (!token?.authenticationToken) throw new Error('Facebook n’a pas renvoyé de jeton.');
    return FacebookAuthProvider.credential(token.authenticationToken, nonce);
  }
  const token = await AccessToken.getCurrentAccessToken();
  if (!token?.accessToken) throw new Error('Facebook n’a pas renvoyé de jeton.');
  return FacebookAuthProvider.credential(token.accessToken);
}
