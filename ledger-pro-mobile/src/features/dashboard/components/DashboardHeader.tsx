import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../store/authStore';
import { Bell, Settings } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export function DashboardHeader() {
  const { user, company } = useAuthStore();
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'LP';

  return (
    <View className="mb-6 pt-2">
      <View className="flex-row justify-between items-center">
        {/* Left: Greeting + Name */}
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>
            {getGreeting()} 👋
          </Text>
          <Text style={{ fontSize: 22, color: '#f8fafc', fontWeight: '800', marginTop: 2 }}>
            {user?.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <View style={{ backgroundColor: '#f97316', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>
                {company?.company_name || 'Ledger-Pro'}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: '#334155', marginLeft: 6 }}>
              {format(new Date(), 'EEE, dd MMM')}
            </Text>
          </View>
        </View>

        {/* Right: Avatar + Bell */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
              alignItems: 'center', justifyContent: 'center',
            }}
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={{
              width: 40, height: 40, borderRadius: 20,
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
            accessibilityLabel="Profile"
          >
            <LinearGradient
              colors={['#f97316', '#ea580c']}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{initials}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
