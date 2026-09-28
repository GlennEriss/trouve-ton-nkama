import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Video } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PublishStackParamList, 'PublishHome'>;

type PublishChoiceCardProps = {
  title: string;
  description: string;
  testID: string;
  icon: React.ReactNode;
  onPress: () => void;
};

function PublishChoiceCard({ title, description, testID, icon, onPress }: PublishChoiceCardProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      activeOpacity={0.72}
      onPress={onPress}
      style={styles.card}
    >
      {icon}
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PublishScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="screen-publier">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Publier</Text>
          <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>
        </View>

        <View style={styles.cards}>
          <PublishChoiceCard
            testID="publish-choice-listing"
            title="Publier une annonce"
            description="Immobilier, mode..."
            icon={<Building2 color={colors.success} size={40} strokeWidth={2} />}
            onPress={() => navigation.navigate('PublishCategory')}
          />
          <PublishChoiceCard
            testID="publish-choice-reel"
            title="Créer un réel"
            description="Vidéo courte pour mettre en avant un bien"
            icon={<Video color={colors.success} size={40} strokeWidth={2} />}
            onPress={() => navigation.navigate('CreateReel')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  heading: { marginBottom: 24 },
  title: { color: colors.foreground, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 20, marginTop: 4 },
  cards: { gap: 16 },
  card: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardCopy: { alignItems: 'center', marginTop: 12 },
  cardTitle: { color: '#1F2937', fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  cardDescription: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'center' },
});
