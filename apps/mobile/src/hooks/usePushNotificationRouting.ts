import { useEffect } from 'react';
import { getMessaging, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation/navigationRef';
import { resolveNotificationTarget } from '../lib/notificationRouting';

type RemoteMessage = NonNullable<Awaited<ReturnType<typeof getInitialNotification>>>;

// Gère le tap sur une notification système FCM (app en arrière-plan -> onNotificationOpenedApp,
// app totalement fermée -> getInitialNotification) pour rediriger vers l'écran pertinent.
// Le cas "app déjà ouverte" (onMessage) n'a pas besoin de ça : l'onglet Notifications écoute
// déjà `notifications` en temps réel via onSnapshot (voir useNotifications.ts), donc la liste
// et le badge se mettent à jour tout seuls sans dépendre de FCM.
function navigateToTarget(message: RemoteMessage) {
  const target = resolveNotificationTarget(message.data?.actionUrl as string | undefined);
  if (!target || !navigationRef.isReady()) return;

  // Route imbriquée depuis la racine : Main (drawer, toujours monté, voir RootStackParamList)
  // -> MainTabs (tab) -> Recherche -> ListingDetail pour une annonce, ou directement Main ->
  // Favoris (Favoris est un Drawer.Screen de premier niveau, pas sous MainTabs, voir
  // DrawerParamList). Si l'utilisateur n'est plus connecté, FavorisScreen redirige lui-même
  // vers SignIn via son propre useRequireAuth — pas besoin de dupliquer cette vérification ici.
  if (target.kind === 'listing') {
    navigationRef.navigate('Main', {
      screen: 'MainTabs',
      params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: target.objectID } } },
    });
  } else if (target.kind === 'favoris') {
    navigationRef.navigate('Main', { screen: 'Favoris' });
  }
}

export function usePushNotificationRouting(): void {
  useEffect(() => {
    const messaging = getMessaging();

    getInitialNotification(messaging).then((message) => {
      if (message) navigateToTarget(message);
    });

    return onNotificationOpenedApp(messaging, navigateToTarget);
  }, []);
}
