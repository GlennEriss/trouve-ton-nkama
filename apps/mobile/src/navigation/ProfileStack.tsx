import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import PhoneVerifyScreen from '../screens/PhoneVerifyScreen';
import LegalWebViewScreen from '../screens/LegalWebViewScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SecurityScreen from '../screens/SecurityScreen';
import { AppHeaderInsetContext } from './AppHeaderInsetContext';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    // Toujours monté sous l'onglet "ProfilOuConnexion" de MainTabs, où AppHeader (hamburger/logo,
    // voir AppDrawer.tsx) est systématiquement affiché au-dessus — voir AppHeaderInsetContext.tsx.
    <AppHeaderInsetContext.Provider value>
      <Stack.Navigator initialRouteName="ProfileHome">
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profil' }} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyListingDetail" component={ListingDetailScreen} options={{ title: 'Détails de l’annonce' }} />
        <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} options={{ title: 'Vérifier mon numéro' }} />
        <Stack.Screen name="Legal" component={LegalWebViewScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Modifier mon profil' }} />
      </Stack.Navigator>
    </AppHeaderInsetContext.Provider>
  );
}
