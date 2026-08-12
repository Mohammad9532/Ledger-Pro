import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { Bell, User } from 'lucide-react-native';
import { format } from 'date-fns';

export function DashboardHeader() {
  const { user, company } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 18) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  };

  return (
    <View className="flex-row justify-between items-center mb-6 mt-2">
      <View>
        <Text className="text-sm font-medium text-muted">{getGreeting()}</Text>
        <Text className="text-xl font-bold text-white mt-1">{user?.name}</Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs font-bold text-primary-500 mr-2">
            {company?.company_name || 'Ledger-Pro'}
          </Text>
          <Text className="text-xs font-medium text-muted/60">
            • Last updated: {format(new Date(), 'h:mm a')}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color="#f8fafc" />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-primary-500/20 items-center justify-center border border-primary-500/30 overflow-hidden"
          accessibilityLabel="Profile"
        >
          {user?.avatar ? (
            /* Future: replace with fast-image or expo-image */
            <User size={20} color="#f97316" /> 
          ) : (
            <User size={20} color="#f97316" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
