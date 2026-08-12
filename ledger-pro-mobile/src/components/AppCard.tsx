import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function AppCard({ className, children, ...props }: ViewProps) {
  return (
    <View
      className={twMerge(
        clsx('bg-card rounded-2xl p-5 border border-border shadow-sm', className)
      )}
      {...props}
    >
      {children}
    </View>
  );
}
