import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LEDGER_RULE_GAP } from '../theme';

interface Props {
  /** Number of hairlines to draw. */
  count?: number;
  /** Vertical distance between lines. */
  gap?: number;
  /** Shift the first line up or down. */
  offset?: number;
  color?: string;
}

/**
 * Faint horizontal hairlines that make a card read as ruled ledger paper.
 * Render inside a parent with `overflow: 'hidden'`.
 */
export function LedgerRules({ count = 8, gap = LEDGER_RULE_GAP, offset = 0, color = 'rgba(231, 240, 235, 0.045)' }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: offset + (i + 1) * gap,
            height: StyleSheet.hairlineWidth,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
