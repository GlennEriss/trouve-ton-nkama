// Mock manuel : @react-navigation/drawer charge react-native-reanimated -> react-native-worklets
// (module natif), qui plante au chargement en environnement Jest — y compris via le mock
// officiel de reanimated, lui-même cassé pour cette version (réimporte le vrai module en
// interne). Implémentation de secours basée sur createNativeStackNavigator : teste bien la
// présence des écrans/routes du drawer, pas les vrais gestes de balayage — DrawerToggleButton
// et le contenu custom du menu (AppDrawerContent) sont testés séparément et isolément.
const React = require('react');
const { createNativeStackNavigator } = require('@react-navigation/native-stack');
const { TouchableOpacity, Text } = require('react-native');

function createDrawerNavigator() {
  return createNativeStackNavigator();
}

function DrawerToggleButton() {
  return React.createElement(TouchableOpacity, { accessibilityLabel: 'Ouvrir le menu' }, React.createElement(Text, null, '☰'));
}

module.exports = { createDrawerNavigator, DrawerToggleButton };
