import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}: AppButtonProps) {
  const baseClasses = 'flex flex-row items-center justify-center rounded-xl font-medium';
  
  const variants = {
    primary: 'bg-primary-500 active:bg-primary-600',
    secondary: 'bg-card active:bg-card/80',
    outline: 'border-2 border-primary-500 bg-transparent active:bg-primary-500/10',
    ghost: 'bg-transparent active:bg-card',
    danger: 'bg-danger active:bg-danger/80',
  };

  const textVariants = {
    primary: 'text-white font-semibold',
    secondary: 'text-white font-medium',
    outline: 'text-primary-500 font-semibold',
    ghost: 'text-white font-medium',
    danger: 'text-white font-semibold',
  };

  const sizes = {
    sm: 'py-2 px-4',
    md: 'py-3.5 px-6',
    lg: 'py-4 px-8',
  };

  return (
    <TouchableOpacity
      className={twMerge(
        clsx(
          baseClasses,
          variants[variant],
          sizes[size],
          (disabled || isLoading) && 'opacity-50',
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? '#f97316' : '#fff'} />
      ) : (
        <Text className={twMerge(clsx('text-base', textVariants[variant]))}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
