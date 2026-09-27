import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LedgerRules } from './LedgerRules';

interface AppCardProps extends ViewProps {
  /** Draw faint ledger hairlines behind the content. */
  ruled?: boolean;
}

export function AppCard({ className, children, ruled = false, ...props }: AppCardProps) {
  return (
    <View
      className={twMerge(
        clsx('bg-card rounded-2xl p-5 border border-border overflow-hidden', className)
      )}
      {...props}
    >
      {ruled && <LedgerRules count={12} />}
      {children}
    </View>
  );
}
