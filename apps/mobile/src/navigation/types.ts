import type { NavigatorScreenParams } from '@react-navigation/native';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  MyListings: undefined;
  PhoneVerify: undefined;
  Legal: { page: 'terms' | 'privacy' | 'dataDeletion' };
  EditProfile: undefined;
};

export type SearchStackParamList = {
  SearchHome: undefined;
  ListingDetail: { objectID: string };
};

// Reprend la structure exacte de BottomNavigation.tsx (web, état non-annonceur) : 5 items +
// bouton central "Publier" — voir [[feedback-mobile-reuse-pwa-design]]. Le web distingue
// annonceur/non-annonceur avec des listes différentes ; simplifié ici en une seule structure
// pour la V1 mobile. "Réels" et "Publier" pointent vers un écran "Bientôt disponible" (V2/V1.1,
// hors du scope V1 déjà verrouillé) mais restent présents pour la fidélité structurelle.
// ProfilOuConnexion est un seul et même écran (ProfileScreen, qui redirige déjà lui-même vers
// SignIn via useRequireAuth) — seul son libellé change selon l'état de connexion.
export type MainTabParamList = {
  Accueil: undefined;
  Recherche: { screen: 'ListingDetail'; params: SearchStackParamList['ListingDetail'] } | undefined;
  Publier: undefined;
  Reels: undefined;
  ProfilOuConnexion: undefined;
};

// Le menu hamburger (drawer) : Demandes de recherche (mis en avant côté web) + Favoris +
// pages légales — ces destinations n'apparaissent PAS dans la barre du bas côté web non plus
// (voir MobileSidebar.tsx). Notifications est accessible depuis une icône du header, pas le
// drawer ni la barre du bas.
export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SearchRequests: undefined;
  Favoris: undefined;
  Notifications: undefined;
  Legal: { page: 'terms' | 'privacy' | 'dataDeletion' };
};

// L'accueil (Main = Drawer > MainTabs) est TOUJOURS monté, connecté ou non — comme le web où
// `/` et `/search` sont publiques (voir src/middleware.ts côté web, PROTECTED_ROUTE_PREFIXES).
// Les écrans d'auth vivent en modal par-dessus, poussés à la demande.
export type RootStackParamList = {
  Main: NavigatorScreenParams<DrawerParamList> | undefined;
  SignIn: undefined;
  SignUp: undefined;
  PhoneSignIn: undefined;
  ForgotPassword: undefined;
};
