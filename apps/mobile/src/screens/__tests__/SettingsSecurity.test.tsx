import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../SettingsScreen';
import SecurityScreen from '../SecurityScreen';
import { useUserDoc } from '../../hooks/useUserDoc';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { updateNotificationSetting } from '../../api/settings';
import { linkAccountProvider } from '../../lib/accountSecurity';
jest.mock('../../hooks/useUserDoc');
jest.mock('../../hooks/useRequireAuth');
jest.mock('../../api/settings', () => ({ ...jest.requireActual('../../api/settings'), updateNotificationSetting: jest.fn() }));
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('../../lib/accountSecurity', () => ({ linkAccountProvider: jest.fn(), securityErrorMessage: () => 'Échec de la vérification.' }));
const Stack = createNativeStackNavigator();
const open = (name = 'Settings') => render(<NavigationContainer><Stack.Navigator initialRouteName={name}><Stack.Screen name="Settings" component={SettingsScreen} /><Stack.Screen name="Security" component={SecurityScreen} /></Stack.Navigator></NavigationContainer>);
beforeEach(() => {
  jest.clearAllMocks();
  (useRequireAuth as jest.Mock).mockReturnValue({ isChecking: false, user: { uid: 'u1', providerData: [{ providerId: 'password' }] } });
  (useUserDoc as jest.Mock).mockReturnValue({ isLoading: false, userDoc: { notificationParameter: {}, providers: ['CREDENTIALS'] } });
  (linkAccountProvider as jest.Mock).mockResolvedValue({ notificationSent: true });
});
it('affiche les six préférences et sauvegarde une seule valeur', async () => {
  await open();
  expect(screen.getAllByRole('switch')).toHaveLength(7);
  await fireEvent(screen.getByLabelText('Recevoir les notifications : Favoris'), 'valueChange', true);
  expect(updateNotificationSetting).toHaveBeenCalledWith('isFavoris', true);
  expect(await screen.findByText('Paramètres enregistrés.')).toBeTruthy();
});
it('affiche une erreur de sauvegarde', async () => {
  (updateNotificationSetting as jest.Mock).mockRejectedValueOnce(new Error('network'));
  await open();
  await fireEvent(screen.getByLabelText('Recevoir les notifications : Favoris'), 'valueChange', true);
  expect(await screen.findByText('Impossible d’enregistrer ce paramètre. Réessayez.')).toBeTruthy();
});
it('ouvre la sécurité depuis les paramètres et permet le retour', async () => {
  await open();
  await fireEvent.press(screen.getByText('Connexion et sécurité'));
  expect(await screen.findByText('Méthodes de connexion')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Retour'));
  expect(await screen.findByText('Apparence')).toBeTruthy();
});
it('exige le mot de passe, puis affiche une confirmation après liaison', async () => {
  await open('Security');
  await fireEvent.press(screen.getByText('Associer'));
  await fireEvent.press(screen.getByText('Confirmer'));
  expect(screen.getByText('Veuillez entrer votre mot de passe.')).toBeTruthy();
  expect(linkAccountProvider).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'private');
  await fireEvent.press(screen.getByText('Confirmer'));
  expect(linkAccountProvider).toHaveBeenCalledWith('GOOGLE', 'private');
  expect(await screen.findByText('Méthode de connexion associée.')).toBeTruthy();
});
it('conserve la modale avec une erreur lors du rejet du mot de passe', async () => {
  (linkAccountProvider as jest.Mock).mockRejectedValue(new Error('wrong password'));
  await open('Security');
  await fireEvent.press(screen.getByText('Associer'));
  await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'wrong');
  await fireEvent.press(screen.getByText('Confirmer'));
  expect(await screen.findByText('Échec de la vérification.')).toBeTruthy();
});
it('ne montre pas de paramètres personnels pendant la garde auth', async () => {
  (useRequireAuth as jest.Mock).mockReturnValue({ isChecking: true });
  await open();
  expect(screen.queryByText('Apparence')).toBeNull();
});
