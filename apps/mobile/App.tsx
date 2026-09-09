import './global.css';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { initSentry } from './src/lib/sentry';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePushNotificationRouting } from './src/hooks/usePushNotificationRouting';

export default function App() {
  useEffect(() => {
    initSentry();
  }, []);

  // Vit au niveau racine (pas dans MainTabs comme useFcmToken) : getInitialNotification doit
  // être vérifié dès le lancement, avant même que l'état d'authentification soit résolu.
  usePushNotificationRouting();

  return (
    // Requis par @react-navigation/drawer (menu hamburger) — sans ça, les gestes de balayage
    // du drawer ne s'initialisent pas correctement sur certains appareils Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
            <StatusBar style="auto" />
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
