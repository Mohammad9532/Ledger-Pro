import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Icons from 'lucide-react-native';
import { QuickAction } from '../types/dashboard';

interface Props {
  actions: QuickAction[];
}

// Map string icon names from backend to Lucide components
const getIconComponent = (iconName: string) => {
  // Convert 'arrow-down-circle' to 'ArrowDownCircle'
  const componentName = iconName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
    
  return (Icons as any)[componentName] || Icons.Circle; // fallback
};

export const QuickActions = memo(function QuickActions({ actions }: Props) {
  const router = useRouter();

  if (!actions || actions.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-white mb-3">Quick Actions</Text>
      <View className="flex-row gap-4">
          {actions.map((action) => {
            const Icon = getIconComponent(action.icon);
            
            return (
              <TouchableOpacity
                key={action.id}
                onPress={() => router.push(action.route as any)}
                className="flex-1 aspect-square bg-card rounded-2xl p-2 border border-border items-center justify-center shadow-sm active:bg-border/50"
              >
                <View className="w-10 h-10 rounded-full bg-primary-500/10 items-center justify-center mb-1">
                  <Icon size={20} color="#f97316" />
                </View>
                <Text 
                  className="text-white text-xs font-medium text-center"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
    </View>
  );
});
