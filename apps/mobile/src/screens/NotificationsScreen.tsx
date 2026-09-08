import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications, type AppNotification } from '../hooks/useNotifications';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { navigationRef } from '../navigation/navigationRef';

function formatDate(createdAt: AppNotification['createdAt']): string {
  if (!createdAt) return '';
  const millis = 'toMillis' in createdAt ? createdAt.toMillis() : createdAt.seconds * 1000;
  return new Date(millis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const { isChecking } = useRequireAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handlePress = (item: AppNotification) => {
    if (!item.isRead) markAsRead(item.id);
    if (!navigationRef.isReady()) return;
    // Beaucoup de destinations web (profil/informations, login-and-security, gifts...) n'ont
    // pas d'équivalent dans le scope V1 mobile — seules les 2 destinations qui existent déjà
    // (détail d'annonce, favoris) sont routées ; les autres notifications restent juste
    // consultables sur place, comme sur le web quand `actionUrl` est absent. Notifications est
    // un Drawer.Screen de premier niveau (pas sous MainTabs, voir DrawerParamList) — navigue
    // via navigationRef, comme FavorisScreen (même raison : cross-navigator).
    if (item.idProperty) {
      navigationRef.navigate('Main', {
        screen: 'MainTabs',
        params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: item.idProperty } } },
      });
    } else if (item.actionUrl === '/favoris') {
      navigationRef.navigate('Main', { screen: 'Favoris' });
    }
  };

  if (isChecking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllAsRead()}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handlePress(item)}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucune notification pour l&apos;instant.</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  markAllText: { fontSize: 13, color: '#146B67', fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#146B67', marginTop: 6 },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  rowTitleUnread: { color: '#000' },
  rowMessage: { fontSize: 13, color: '#555' },
  rowDate: { fontSize: 11, color: '#999', marginTop: 2 },
});
