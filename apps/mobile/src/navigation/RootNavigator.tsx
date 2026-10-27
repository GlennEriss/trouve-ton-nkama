import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppTheme } from '../theme/ThemeProvider';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppDrawer } from './AppDrawer';
import { navigationRef } from './navigationRef';
import { useAuthState } from '../hooks/useAuthState';
import { colors } from '../theme/colors';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignUpSuccessScreen from '../screens/auth/SignUpSuccessScreen';
import PhoneSignInScreen from '../screens/auth/PhoneSignInScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Main (MainTabs) est TOUJOURS monté, comme la page d'accueil publique du web (voir le
// commentaire sur RootStackParamList, types.ts) — plus de mur de connexion à l'ouverture de
// l'app. Le seul blocage restant est le très bref instant où Firebase Auth détermine s'il y a
// une session persistée (initializing) : équivalent de l'hydratation de session côté web, pas
// une exigence de connexion.
export function RootNavigator() {
  const { mode, palette } = useAppTheme();
  const { initializing } = useAuthState();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={{ ...(mode === 'dark' ? DarkTheme : DefaultTheme), colors: { ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors, background: palette.background, card: palette.surface, text: palette.foreground, border: palette.border, primary: palette.primary } }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={AppDrawer} />
        <Stack.Group screenOptions={{ presentation: 'modal', headerShown: true }}>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: '' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Inscription' }} />
          <Stack.Screen name="SignUpSuccess" component={SignUpSuccessScreen} options={{ title: 'Compte créé' }} />
          <Stack.Screen name="PhoneSignIn" component={PhoneSignInScreen} options={{ title: 'Téléphone' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Mot de passe oublié' }} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
