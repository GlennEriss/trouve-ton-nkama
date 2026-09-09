import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import EditProfileScreen from '../EditProfileScreen';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

// EditProfileScreen appelle navigation.goBack() après l'enregistrement — sans écran précédent
// dans l'historique (pas de vrai Stack.Navigator ici), React Navigation logue un warning
// inoffensif ("navigation hasn't been initialized") mais n'affecte pas la validité du test :
// seul le comportement testé ici (l'appel à updateDoc) compte.
function renderScreen() {
  return render(
    <NavigationContainer>
      <EditProfileScreen />
    </NavigationContainer>,
  );
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedOnSnapshot.mockImplementation((_ref, cb) => {
      cb({ data: () => ({ firstname: 'Jean', lastname: 'Mba' }) });
      return jest.fn();
    });
  });

  it('pré-remplit le formulaire avec les valeurs actuelles', async () => {
    await renderScreen();
    expect(await screen.findByDisplayValue('Jean')).toBeTruthy();
    expect(await screen.findByDisplayValue('Mba')).toBeTruthy();
  });

  it('enregistre les nouvelles valeurs saisies', async () => {
    await renderScreen();
    const firstnameInput = await screen.findByDisplayValue('Jean');
    await fireEvent.changeText(firstnameInput, 'Jean-Pierre');
    await fireEvent.press(screen.getByText('Enregistrer'));

    await waitFor(() =>
      expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { firstname: 'Jean-Pierre', lastname: 'Mba' }),
    );
  });

  it('désactive Enregistrer si le prénom est vidé', async () => {
    await renderScreen();
    const firstnameInput = await screen.findByDisplayValue('Jean');
    await fireEvent.changeText(firstnameInput, '');

    expect(screen.getByText('Enregistrer').parent?.props.accessibilityState?.disabled).toBe(true);
  });
});
