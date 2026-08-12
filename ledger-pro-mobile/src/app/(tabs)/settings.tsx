import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Shield, Bell, HelpCircle, LogOut, ChevronRight, Terminal } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const [devClicks, setDevClicks] = useState(0);

  const handleVersionTap = () => {
    const newClicks = devClicks + 1;
    setDevClicks(newClicks);
    if (newClicks >= 5) {
      setDevClicks(0);
      router.push('/settings/developer');
    }
  };

  const menuItems = [
    { icon: User, label: 'Profile Information', route: null },
    { icon: Shield, label: 'Security & Privacy', route: null },
    { icon: Bell, label: 'Notifications', route: null },
    { icon: HelpCircle, label: 'Help & Support', route: null },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-white text-2xl font-bold mb-6">Settings</Text>

        {/* Profile Card */}
        <View className="bg-card p-4 rounded-2xl mb-6 border border-border flex-row items-center">
          <View className="w-14 h-14 bg-slate-800 rounded-full items-center justify-center mr-4 border border-slate-700">
            <Text className="text-white text-xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">{user?.name || 'User'}</Text>
            <Text className="text-muted text-sm">{user?.email || 'user@example.com'}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-card rounded-2xl border border-border mb-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              className={`p-4 flex-row items-center active:bg-slate-800/50 ${index !== menuItems.length - 1 ? 'border-b border-border' : ''}`}
            >
              <View className="w-10 h-10 bg-slate-800 rounded-full items-center justify-center mr-4">
                <item.icon size={20} color="#94a3b8" />
              </View>
              <Text className="flex-1 text-white text-base font-medium">{item.label}</Text>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Developer Shortcut (Visible if clicks > 0 to hint) */}
        {devClicks > 0 && devClicks < 5 && (
          <Text className="text-muted text-center mb-4">
            Tap {5 - devClicks} more times to enter developer mode
          </Text>
        )}

        <TouchableOpacity 
          className="bg-card rounded-2xl border border-border p-4 flex-row items-center justify-center active:bg-slate-800/50 mb-8"
          onPress={logout}
        >
          <LogOut size={20} color="#ef4444" className="mr-3" />
          <Text className="text-danger font-bold text-base">Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center pb-8" 
          activeOpacity={1}
          onPress={handleVersionTap}
        >
          <Text className="text-muted text-xs">Ledger-Pro Mobile</Text>
          <Text className="text-muted text-xs mt-1">v0.4.0-alpha</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
