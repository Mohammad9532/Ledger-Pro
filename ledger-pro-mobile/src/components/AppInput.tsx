import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { colors, fonts, text } from '../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Optional element rendered at the end of the field (e.g. an icon button). */
  trailing?: React.ReactNode;
}

export function AppInput({ label, error, trailing, className, onFocus, onBlur, style, ...props }: AppInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && <Text style={[text.eyebrow, { marginBottom: 8 }]}>{label}</Text>}
      <View
        className={twMerge(
          clsx(
            'flex-row items-center bg-background border rounded-xl px-4',
            focused ? 'border-primary-500' : 'border-border',
            error && 'border-danger',
            className
          )
        )}
        style={{ minHeight: 50 }}
      >
        <TextInput
          className="flex-1 text-base text-text"
          style={[{ fontFamily: fonts.sans, paddingVertical: 12 }, style]}
          placeholderTextColor={colors.inkGhost}
          selectionColor={colors.primary}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
          value={props.value ?? ''}
        />
        {trailing}
      </View>
      {error && (
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.negative, marginTop: 6 }}>{error}</Text>
      )}
    </View>
  );
}
