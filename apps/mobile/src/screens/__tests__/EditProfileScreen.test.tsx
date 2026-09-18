import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot, updateDoc, getDocs } from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import EditProfileScreen from '../EditProfileScreen';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;

function renderScreen() {
  return render(
    <NavigationContainer>
      <EditProfileScreen />
    </NavigationContainer>,
  );
}

async function setUserDoc(data: Record<string, unknown>) {
  await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
  const [, callback] = mockedOnSnapshot.mock.calls[0];
  await act(async () => {
    callback({ data: () => data });
  });
}

const baseUser = {
  firstname: 'Jean',
  lastname: 'Mba',
  email: 'jean@example.com',
  birthDate: '1990-06-15',
  pseudo: '',
  callNumber: '+24166000000',
  phoneNumbers: ['+24166000000'],
  phoneNumberVerified: false,
  roles: ['User'],
};

// Compte inscrit par téléphone (OTP) : pas d'email encore — voir hasEmail, EditProfileScreen.tsx.
const phoneOnlyUser = { ...baseUser, email: '' };

describe('EditProfileScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedOnSnapshot.mockImplementation(() => jest.fn());
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('affiche Prénom/Nom/Email/Date de naissance en lecture seule', async () => {
    renderScreen();
    await setUserDoc(baseUser);

    expect(await screen.findByDisplayValue('Jean')).toBeTruthy();
    const firstnameInput = screen.getByDisplayValue('Jean');
    expect(firstnameInput.props.editable).toBe(false);
    expect(screen.getByDisplayValue('Mba').props.editable).toBe(false);
    expect(screen.getByDisplayValue('jean@example.com').props.editable).toBe(false);
    expect(screen.getByDisplayValue('1990-06-15').props.editable).toBe(false);
  });

  it('pré-remplit le numéro de téléphone modifiable', async () => {
    renderScreen();
    await setUserDoc(baseUser);

    const phoneInput = await screen.findByTestId('edit-profile-phone');
    expect(phoneInput.props.value).toBe('66000000');
    expect(phoneInput.props.editable).not.toBe(false);
  });

  it('enregistre le nouveau numéro de téléphone', async () => {
    renderScreen();
    await setUserDoc(baseUser);

    const phoneInput = await screen.findByTestId('edit-profile-phone');
    await fireEvent.changeText(phoneInput, '77123456');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ callNumber: '+24177123456', phoneNumbers: ['+24177123456'] }),
      ),
    );
  });

  it('verrouille le champ téléphone si le numéro est vérifié et encore sous le délai de 30 jours', async () => {
    renderScreen();
    await setUserDoc({
      ...baseUser,
      phoneNumberVerified: true,
      metadata: { phoneVerification: { lockUntil: Date.now() + 5 * 24 * 60 * 60 * 1000 } },
    });

    const phoneInput = await screen.findByTestId('edit-profile-phone');
    expect(phoneInput.props.editable).toBe(false);
    expect(screen.getByText(/Numéro verrouillé temporairement/)).toBeTruthy();
  });

  it('avertit de la perte du statut vérifié si on change un numéro vérifié non verrouillé', async () => {
    renderScreen();
    await setUserDoc({ ...baseUser, phoneNumberVerified: true });

    const phoneInput = await screen.findByTestId('edit-profile-phone');
    await fireEvent.changeText(phoneInput, '77123456');

    expect(await screen.findByText(/vous perdrez le statut/)).toBeTruthy();
  });

  it("n'affiche pas la section réseaux sociaux pour un compte non-annonceur", async () => {
    renderScreen();
    await setUserDoc(baseUser);
    await screen.findByTestId('edit-profile-phone');

    expect(screen.queryByText('Réseaux sociaux (facultatif)')).toBeNull();
  });

  it('affiche et enregistre la section réseaux sociaux pour un compte annonceur', async () => {
    renderScreen();
    await setUserDoc({ ...baseUser, roles: ['User', 'Announcer'] });

    await fireEvent.press(await screen.findByTestId('edit-profile-social-toggle'));
    const instagramInput = await screen.findByTestId('edit-profile-social-instagram');
    await fireEvent.changeText(instagramInput, 'jean.mba');

    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          socialProfiles: expect.objectContaining({ instagram: { handle: '@jean.mba' } }),
        }),
      ),
    );
  });

  it('enregistre le pseudo (nom de l’entreprise)', async () => {
    renderScreen();
    await setUserDoc(baseUser);

    const pseudoInput = await screen.findByTestId('edit-profile-pseudo');
    await fireEvent.changeText(pseudoInput, 'Ma Boutique');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pseudo: 'Ma Boutique' })),
    );
  });

  it('laisse le champ email modifiable pour un compte inscrit par téléphone (sans email)', async () => {
    renderScreen();
    await setUserDoc(phoneOnlyUser);

    const emailInput = await screen.findByTestId('edit-profile-email');
    expect(emailInput.props.editable).not.toBe(false);
    expect(screen.getByText(/ajoutez une adresse email pour sécuriser votre compte/)).toBeTruthy();
  });

  it('enregistre le nouvel email pour un compte téléphone sans email, après vérification d’unicité', async () => {
    mockedGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    renderScreen();
    await setUserDoc(phoneOnlyUser);

    const emailInput = await screen.findByTestId('edit-profile-email');
    await fireEvent.changeText(emailInput, 'jean@example.com');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ email: 'jean@example.com' })),
    );
  });

  it('refuse un email invalide pour un compte téléphone sans email', async () => {
    renderScreen();
    await setUserDoc(phoneOnlyUser);

    const emailInput = await screen.findByTestId('edit-profile-email');
    await fireEvent.changeText(emailInput, 'pas-un-email');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    expect(await screen.findByText("L'adresse email n'est pas valide.")).toBeTruthy();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('refuse un email déjà utilisé par un autre compte', async () => {
    mockedGetDocs.mockResolvedValueOnce({ empty: false, docs: [{ id: 'uid-2' }] });
    renderScreen();
    await setUserDoc(phoneOnlyUser);

    const emailInput = await screen.findByTestId('edit-profile-email');
    await fireEvent.changeText(emailInput, 'deja-utilise@example.com');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    expect(await screen.findByText('Cette adresse email est déjà utilisée par un autre compte.')).toBeTruthy();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('n’envoie jamais email si le compte en a déjà un (ne remplace jamais un email existant)', async () => {
    renderScreen();
    await setUserDoc(baseUser);

    const pseudoInput = await screen.findByTestId('edit-profile-pseudo');
    await fireEvent.changeText(pseudoInput, 'Autre nom');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalled());
    const [, payload] = mockedUpdateDoc.mock.calls[0];
    expect(payload).not.toHaveProperty('email');
  });
});
