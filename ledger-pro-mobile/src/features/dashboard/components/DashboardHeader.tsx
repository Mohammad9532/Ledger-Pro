import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { Bell } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../../theme';

export function DashboardHeader() {
  const { user, company } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'LP';

  return (
    <View className="mb-6" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <View className="flex-row justify-between items-center">
        {/* Left: greeting + name */}
        <View className="flex-1 pr-3">
          <Text style={{ fontFamily: fonts.displayItalic, fontSize: 18, color: colors.inkMuted }}>
            {getGreeting()},
          </Text>
          <Text
            style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink, letterSpacing: -0.4, marginTop: 2 }}
            numberOfLines={1}
          >
            {user?.name}
          </Text>
          <View className="flex-row items-center mt-2">
            <View
              style={{
                backgroundColor: colors.primarySoft,
                borderColor: 'rgba(198, 241, 59, 0.35)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 10, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' }}>
                {company?.company_name || 'Ledger Pro'}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.inkGhost, marginLeft: 8 }}>
              {format(new Date(), 'EEE, dd MMM')}
            </Text>
          </View>
        </View>

        {/* Right: bell + avatar */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color={colors.inkMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: colors.surface3,
            }}
            accessibilityLabel="Profile"
          >
            <Text style={{ fontFamily: fonts.display, color: colors.onPrimary, fontSize: 17 }}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
