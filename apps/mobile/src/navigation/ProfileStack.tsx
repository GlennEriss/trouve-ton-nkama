import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import PhoneVerifyScreen from '../screens/PhoneVerifyScreen';
import LegalWebViewScreen from '../screens/LegalWebViewScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profil' }} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: 'Mes annonces' }} />
      <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} options={{ title: 'Vérifier mon numéro' }} />
      <Stack.Screen name="Legal" component={LegalWebViewScreen} options={{ title: '' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Modifier mon profil' }} />
    </Stack.Navigator>
  );
}
