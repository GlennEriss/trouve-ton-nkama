import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainTabs } from './MainTabs';
import { AppHeader } from './AppHeader';
import { AppDrawerContent } from './AppDrawerContent';
import SearchRequestsScreen from '../screens/SearchRequestsScreen';
import FavorisScreen from '../screens/FavorisScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LegalWebViewScreen from '../screens/LegalWebViewScreen';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

// Main (toujours monté, voir RootStackParamList) = ce Drawer. MainTabs (barre du bas) est
// l'écran par défaut ; SearchRequests/Favoris/Notifications/Legal sont des Drawer.Screen de
// premier niveau (pas sous MainTabs) car ils n'apparaissent pas dans la barre du bas côté web
// non plus — voir la note détaillée dans types.ts (DrawerParamList).
export function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{ header: (props) => <AppHeader {...props} /> }}
      drawerContent={(props) => <AppDrawerContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
      <Drawer.Screen name="SearchRequests" component={SearchRequestsScreen} />
      <Drawer.Screen name="Favoris" component={FavorisScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Legal" component={LegalWebViewScreen} />
    </Drawer.Navigator>
  );
}
