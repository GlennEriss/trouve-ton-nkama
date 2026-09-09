// Doit être le tout premier import du point d'entrée (exigence react-native-gesture-handler,
// requis par @react-navigation/drawer) — sinon les gestes du drawer ne s'initialisent pas
// correctement sur certains appareils Android.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
