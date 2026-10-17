import { getAuth, reload, reauthenticateWithCredential, linkWithCredential, signInWithCredential } from '@react-native-firebase/auth';
import { updateDoc } from '@react-native-firebase/firestore';
import { requestGoogleIdentity } from '../googleAuth';
import { apiFetch } from '../../api/client';
import { linkAccountProvider, securityErrorMessage } from '../accountSecurity';
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(), reload: jest.fn(), reauthenticateWithCredential: jest.fn(), linkWithCredential: jest.fn(), signInWithCredential: jest.fn(),
  EmailAuthProvider: { credential: jest.fn(() => ({ providerId: 'password' })) },
  GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: 'google.com' })) },
}));
jest.mock('@react-native-firebase/firestore');
jest.mock('../googleAuth', () => ({ requestGoogleIdentity: jest.fn() }));
jest.mock('../facebookAuth', () => ({ requestFacebookCredential: jest.fn(async () => ({ providerId: 'facebook.com' })) }));
jest.mock('../../api/client', () => ({ apiFetch: jest.fn() }));
const user = { uid: 'owner', email: 'owner@example.test', providerData: [{ providerId: 'password' }] };
beforeEach(() => {
  jest.clearAllMocks();
  (reload as jest.Mock).mockResolvedValue(undefined);
  (reauthenticateWithCredential as jest.Mock).mockResolvedValue(undefined);
  (apiFetch as jest.Mock).mockResolvedValue({ success: true });
  (getAuth as jest.Mock).mockReturnValue({ currentUser: user });
  (requestGoogleIdentity as jest.Mock).mockResolvedValue({ idToken: 'google-id-token' });
});
it('réauthentifie puis lie Google au même compte sans connexion ni mot de passe stocké', async () => {
  await linkAccountProvider('GOOGLE', 'private-password');
  expect(reauthenticateWithCredential).toHaveBeenCalledWith(user, expect.anything());
  expect(linkWithCredential).toHaveBeenCalledWith(user, expect.anything());
  expect(signInWithCredential).not.toHaveBeenCalled();
  expect(JSON.stringify((updateDoc as jest.Mock).mock.calls)).not.toContain('private-password');
  expect(apiFetch).toHaveBeenCalledWith('/api/users/account-activity/notify', expect.objectContaining({ method: 'POST' }));
});
it('ne lance pas OAuth si le mot de passe est incorrect', async () => {
  (reauthenticateWithCredential as jest.Mock).mockRejectedValue({ code: 'auth/wrong-password' });
  await expect(linkAccountProvider('GOOGLE', 'wrong')).rejects.toEqual({ code: 'auth/wrong-password' });
  expect(requestGoogleIdentity).not.toHaveBeenCalled();
  expect(linkWithCredential).not.toHaveBeenCalled();
});
it('refuse une session absente', async () => {
  (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  await expect(linkAccountProvider('GOOGLE')).rejects.toThrow('Reconnectez-vous');
});
it('refuse un changement de session pendant OAuth', async () => {
  (requestGoogleIdentity as jest.Mock).mockImplementation(async () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'other' } });
    return { idToken: 'token' };
  });
  await expect(linkAccountProvider('GOOGLE', 'password')).rejects.toThrow('session a changé');
  expect(linkWithCredential).not.toHaveBeenCalled();
});
it('synchronise une liaison déjà faite sans relancer OAuth', async () => {
  (getAuth as jest.Mock).mockReturnValue({ currentUser: { ...user, providerData: [{ providerId: 'google.com' }] } });
  await linkAccountProvider('GOOGLE');
  expect(requestGoogleIdentity).not.toHaveBeenCalled();
  expect(updateDoc).toHaveBeenCalled();
});
it('signale séparément un échec de notification après liaison réussie', async () => {
  (apiFetch as jest.Mock).mockRejectedValue(new Error('network'));
  await expect(linkAccountProvider('GOOGLE', 'password')).resolves.toEqual({ notificationSent: false });
});
it('lie Facebook sans remplacer le compte Firebase', async () => {
  await linkAccountProvider('FACEBOOK', 'password');
  expect(linkWithCredential).toHaveBeenCalledWith(user, { providerId: 'facebook.com' });
  expect(signInWithCredential).not.toHaveBeenCalled();
});
it.each(['auth/credential-already-in-use', 'auth/provider-already-linked', 'auth/invalid-credential', 'auth/requires-recent-login'])('traduit %s sans afficher les données sensibles', code => {
  expect(securityErrorMessage({ code, message: 'secret-token' })).not.toContain('secret-token');
});
