import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Icons from 'lucide-react-native';
import { QuickAction } from '../types/dashboard';
import { colors, fonts, radius, text } from '../../../theme';

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
      <Text style={[text.sectionTitle, { marginBottom: 12 }]}>Quick actions</Text>
      <View className="flex-row gap-3">
        {actions.map((action) => {
          const Icon = getIconComponent(action.icon);

          return (
            <TouchableOpacity
              key={action.id}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={{
                flex: 1,
                aspectRatio: 1,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Icon size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <Text
                style={{ fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.ink, textAlign: 'center' }}
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
