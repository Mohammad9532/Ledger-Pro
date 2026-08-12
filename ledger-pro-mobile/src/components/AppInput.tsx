import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, className, ...props }: AppInputProps) {
  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-muted mb-1.5">{label}</Text>}
      <View
        className={twMerge(
          clsx(
            'flex-row items-center border border-border bg-card rounded-xl px-4 py-3.5',
            error && 'border-danger',
            className
          )
        )}
      >
        <TextInput
          className="flex-1 text-base text-text"
          placeholderTextColor="#64748b" // slate-500
          {...props}
          value={props.value ?? ''}
        />
      </View>
      {error && <Text className="text-xs text-danger mt-1.5">{error}</Text>}
    </View>
  );
}
