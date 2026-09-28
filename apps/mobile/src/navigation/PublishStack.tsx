import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PublishScreen from '../screens/PublishScreen';
import PublishCategoryScreen from '../screens/PublishCategoryScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import CreateReelScreen from '../screens/CreateReelScreen';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from './types';

const Stack = createNativeStackNavigator<PublishStackParamList>();

export function PublishStack() {
  return (
    <Stack.Navigator
      initialRouteName="PublishHome"
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerStyle: { backgroundColor: '#fff' },
        contentStyle: { backgroundColor: '#fff' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="PublishHome" component={PublishScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PublishCategory" component={PublishCategoryScreen} options={{ title: '' }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: '' }} />
      <Stack.Screen name="CreateReel" component={CreateReelScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
