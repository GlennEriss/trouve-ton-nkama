import React from 'react';
import { Text, Button } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useAppTheme } from '../ThemeProvider';
function Probe() {
  const { mode, ready, setMode } = useAppTheme();
  const [error, setError] = React.useState(false);
  return <><Text>{ready ? mode : 'loading'}</Text><Button title="Changer" onPress={() => void setMode('dark').catch(() => setError(true))} />{error && <Text>Erreur</Text>}</>;
}
beforeEach(() => { jest.clearAllMocks(); (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined); });
it('restaure le thème sombre enregistré', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(await screen.findByText('dark')).toBeTruthy();
});
it('persiste le choix avant de changer le thème', async () => {
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  await screen.findByText('light');
  await fireEvent.press(screen.getByText('Changer'));
  expect(await screen.findByText('dark')).toBeTruthy();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('tonnkama.appearance', 'dark');
});
it('garde le thème précédent si la persistance échoue', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk'));
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  await screen.findByText('light');
  await fireEvent.press(screen.getByText('Changer'));
  expect(await screen.findByText('Erreur')).toBeTruthy();
  expect(screen.getByText('light')).toBeTruthy();
});
