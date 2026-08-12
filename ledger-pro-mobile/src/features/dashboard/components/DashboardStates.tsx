import React from 'react';
import { View, Text } from 'react-native';
import { CircleDollarSign } from 'lucide-react-native';
import { AppButton } from '../../../components/AppButton';

export function DashboardSkeleton() {
  return (
    <View className="flex-1 px-4 mt-4">
      {/* Header Skeleton */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <View className="w-24 h-4 bg-border/50 rounded-md mb-2" />
          <View className="w-32 h-6 bg-border/50 rounded-md mb-2" />
          <View className="w-20 h-3 bg-border/50 rounded-md" />
        </View>
        <View className="flex-row gap-3">
          <View className="w-10 h-10 rounded-full bg-border/50" />
          <View className="w-10 h-10 rounded-full bg-border/50" />
        </View>
      </View>

      {/* Hero Card Skeleton */}
      <View className="bg-border/30 rounded-3xl h-32 mb-4" />
      
      {/* Sub Cards Skeleton */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-1 bg-border/30 rounded-2xl h-28" />
        <View className="flex-1 bg-border/30 rounded-2xl h-28" />
      </View>
      
      {/* Monthly Overview Skeleton */}
      <View className="mt-4 mb-3">
        <View className="w-28 h-6 bg-border/50 rounded-md mb-3" />
        <View className="bg-border/30 rounded-2xl h-36" />
      </View>
    </View>
  );
}

export function DashboardEmptyState() {
  return (
    <View className="flex-1 items-center justify-center p-6 mt-10">
      <View className="w-24 h-24 rounded-full bg-primary-500/10 items-center justify-center mb-6">
        <CircleDollarSign size={48} color="#f97316" />
      </View>
      <Text className="text-2xl font-bold text-white text-center mb-2">Welcome to Ledger-Pro</Text>
      <Text className="text-base text-muted text-center mb-8">
        Your dashboard is currently empty. Start by adding your first financial transaction.
      </Text>
      
      <View className="w-full gap-4">
        <AppButton title="Add Income" variant="primary" />
        <AppButton title="Add Expense" variant="outline" />
      </View>
    </View>
  );
}
