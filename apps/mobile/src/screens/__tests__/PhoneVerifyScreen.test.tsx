import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { getAuth, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from '@react-native-firebase/auth';
import { updateDoc, onSnapshot } from '@react-native-firebase/firestore';
import PhoneVerifyScreen from '../PhoneVerifyScreen';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedSignInWithPhoneNumber = signInWithPhoneNumber as jest.Mock;
const mockedLinkWithCredential = linkWithCredential as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;

describe('PhoneVerifyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    // useUserDoc s'abonne à users/{uid} : par défaut, aucun document -> pas encore vérifié.
    mockedOnSnapshot.mockImplementation((_ref, cb) => {
      cb({ data: () => ({ phoneNumberVerified: false }) });
      return jest.fn();
    });
  });

  it("affiche directement 'Numéro vérifié ✓' si déjà vérifié (pas de formulaire)", async () => {
    mockedOnSnapshot.mockImplementation((_ref, cb) => {
      cb({ data: () => ({ phoneNumberVerified: true }) });
      return jest.fn();
    });
    await render(<PhoneVerifyScreen />);

    expect(await screen.findByText('Numéro vérifié ✓')).toBeTruthy();
    expect(screen.queryByPlaceholderText('074123456')).toBeNull();
  });

  it('rattache le numéro via linkWithCredential (pas signInWithPhoneNumber.confirm) et marque phoneNumberVerified', async () => {
    mockedSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-1' });
    mockedLinkWithCredential.mockResolvedValue({ user: { uid: 'uid-1' } });
    (PhoneAuthProvider.credential as jest.Mock).mockReturnValue({ mocked: 'credential' });

    await render(<PhoneVerifyScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('074123456'), '074123456');
    await fireEvent.press(screen.getByText('Envoyer le code'));

    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.press(screen.getByText('Confirmer'));

    expect(PhoneAuthProvider.credential).toHaveBeenCalledWith('vid-1', '123456');
    expect(mockedLinkWithCredential).toHaveBeenCalledWith({ uid: 'uid-1' }, { mocked: 'credential' });
    await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { phoneNumberVerified: true }));
    expect(await screen.findByText('Numéro vérifié ✓')).toBeTruthy();
  });

  it('affiche "Ce numéro est déjà associé à un autre compte." pour auth/credential-already-in-use', async () => {
    mockedSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-1' });
    mockedLinkWithCredential.mockRejectedValue({ code: 'auth/credential-already-in-use' });

    await render(<PhoneVerifyScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('074123456'), '074123456');
    await fireEvent.press(screen.getByText('Envoyer le code'));
    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.press(screen.getByText('Confirmer'));

    expect(await screen.findByText('Ce numéro est déjà associé à un autre compte.')).toBeTruthy();
  });
});
