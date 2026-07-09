// Service worker dédié Firebase Cloud Messaging (notifications push en arrière-plan).
// Enregistré sur un scope dédié ('/firebase-cloud-messaging-push-scope/') pour coexister
// sans conflit avec le service worker PWA généré par next-pwa (public/sw.js, scope '/').
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDTDgSuhMnfwaZXealjZT3hUIV5XLZUJUU',
  authDomain: 'location-maison-prod-167da.firebaseapp.com',
  projectId: 'location-maison-prod-167da',
  storageBucket: 'location-maison-prod-167da.firebasestorage.app',
  messagingSenderId: '665459015238',
  appId: '1:665459015238:web:3f446a4ef19c9944051447',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Trouve Ton Nkama';
  const body = payload.notification?.body || payload.data?.message || '';
  const url = payload.fcmOptions?.link || payload.data?.actionUrl || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-64x64.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
