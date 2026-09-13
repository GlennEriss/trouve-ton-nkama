import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import TermsOfUseScreen from './TermsOfUseScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import DataDeletionScreen from './DataDeletionScreen';

// Les 3 pages légales (CGU, politique de confidentialité, suppression des données) sont
// désormais des écrans natifs dédiés — demande explicite de vrais écrans accessibles plutôt
// que le chargement réseau d'une page web distante (l'ancien comportement WebView). Ce composant
// reste un simple aiguilleur par page, gardé sous ce nom pour ne pas toucher son enregistrement
// dans ProfileStack.tsx / AppDrawer.tsx.
type Props = NativeStackScreenProps<ProfileStackParamList, 'Legal'>;

export default function LegalWebViewScreen({ route }: Props) {
  switch (route.params.page) {
    case 'terms':
      return <TermsOfUseScreen />;
    case 'privacy':
      return <PrivacyPolicyScreen />;
    case 'dataDeletion':
      return <DataDeletionScreen />;
  }
}
