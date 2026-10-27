import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { AppDrawerContent } from '../AppDrawerContent';

jest.mock('../../components/Logo', () => ({ Logo: () => null }));

function props() {
  const navigation = { navigate: jest.fn(), closeDrawer: jest.fn() };
  const drawerProps = {
    navigation,
    state: { index: 0, routes: [{ key: 'main', name: 'MainTabs' }] },
    descriptors: {},
  } as unknown as DrawerContentComponentProps;
  return { drawerProps, navigation };
}

describe('AppDrawerContent', () => {
  it('place Mes annonces entre Accueil et Demandes de recherche', async () => {
    const { drawerProps } = props();
    const view = await render(<AppDrawerContent {...drawerProps} />);
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf('Accueil')).toBeLessThan(tree.indexOf('Mes annonces'));
    expect(tree.indexOf('Mes annonces')).toBeLessThan(tree.indexOf('Demandes de recherche'));
  });

  it('ouvre le screen natif Mes annonces puis ferme la sidebar', async () => {
    const { drawerProps, navigation } = props();
    await render(<AppDrawerContent {...drawerProps} />);
    fireEvent.press(screen.getByTestId('drawer-link-my-listings'));
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'ProfilOuConnexion',
      params: { screen: 'MyListings' },
    });
    expect(navigation.closeDrawer).toHaveBeenCalled();
  });
});
