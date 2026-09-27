import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { colors } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary-500 active:bg-primary-600',
  secondary: 'bg-surface border border-border active:bg-elevated',
  outline: 'border border-primary-500/60 bg-transparent active:bg-primary-500/10',
  ghost: 'bg-transparent active:bg-surface',
  danger: 'bg-danger active:opacity-90',
};

const textVariants: Record<Variant, string> = {
  primary: 'text-onprimary font-sans-semibold',
  secondary: 'text-text font-sans-semibold',
  outline: 'text-primary-500 font-sans-semibold',
  ghost: 'text-muted font-sans-medium',
  danger: 'text-background font-sans-semibold',
};

const spinnerColors: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.ink,
  outline: colors.primary,
  ghost: colors.primary,
  danger: colors.bg,
};

const sizes: Record<Size, string> = {
  sm: 'py-2 px-4 rounded-lg',
  md: 'py-3.5 px-6 rounded-xl',
  lg: 'py-4 px-8 rounded-2xl',
};

const textSizes: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || isLoading), busy: isLoading }}
      className={twMerge(
        clsx(
          'flex flex-row items-center justify-center',
          variants[variant],
          sizes[size],
          (disabled || isLoading) && 'opacity-50',
          className
        )
      )}
      disabled={disabled || isLoading}
      activeOpacity={0.85}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={spinnerColors[variant]} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={twMerge(clsx(textSizes[size], textVariants[variant]))}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
