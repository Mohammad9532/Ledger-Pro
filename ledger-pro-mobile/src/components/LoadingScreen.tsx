import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BrandMark } from './BrandMark';
import { colors } from '../theme';

// Rendered before custom fonts are available, so it uses no text.
export function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <BrandMark size={56} />
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}
