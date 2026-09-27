import React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../theme';

/** Ledger Pro mark: three ruled lines and a tick, on the lime brand tile. */
export function BrandMark({ size = 40 }: { size?: number }) {
  const line = Math.max(2, Math.round(size * 0.07));
  const pad = size * 0.24;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: colors.primary,
        paddingHorizontal: pad,
        paddingVertical: pad,
        justifyContent: 'space-between',
      }}
      accessibilityElementsHidden
    >
      <View style={{ height: line, borderRadius: line, backgroundColor: colors.onPrimary, width: '100%' }} />
      <View style={{ height: line, borderRadius: line, backgroundColor: colors.onPrimary, width: '68%' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ height: line, borderRadius: line, backgroundColor: colors.onPrimary, width: '36%' }} />
        <Check size={size * 0.3} color={colors.onPrimary} strokeWidth={3.2} />
      </View>
    </View>
  );
}
