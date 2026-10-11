import React from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

function resolveFontFamily(style: TextProps['style'] | TextInputProps['style']) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = String(flattened?.fontWeight ?? '400');
  if (weight === '800' || weight === '900' || weight === 'heavy' || weight === 'black') return fontFamilies.extrabold;
  if (weight === '700' || weight === 'bold') return fontFamilies.bold;
  if (weight === '600' || weight === 'semibold') return fontFamilies.semibold;
  if (weight === '500' || weight === 'medium') return fontFamilies.medium;
  return fontFamilies.regular;
}

/**
 * Primitive typographique global de l'application.
 *
 * Le transform Babel remplace les imports React Native `Text`/`TextInput` par
 * ces composants. Les styles des écrans restent donc inchangés tandis que les
 * graisses utilisent de vrais fichiers de police au lieu du faux gras Android.
 */
export const AppText = React.forwardRef<React.ElementRef<typeof NativeText>, TextProps>(function AppText({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={[style, { fontFamily: resolveFontFamily(style), fontWeight: 'normal' }]} />;
});

export const AppTextInput = React.forwardRef<React.ElementRef<typeof NativeTextInput>, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[style, { fontFamily: resolveFontFamily(style), fontWeight: 'normal' }]} />;
});

