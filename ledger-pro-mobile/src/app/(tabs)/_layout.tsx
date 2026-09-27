import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, Plus, BarChart2, Plane } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CreateTransactionSheet } from '../../features/transactions/components/CreateTransactionSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors, fonts, shadow } from '../../theme';

function CustomTabBar({ state, navigation, onFabPress }: { state: any; navigation: any; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();

  const isTabActive = (name: string) => state.routes[state.index].name === name;

  const TabBtn = ({ name, icon: Icon, label }: { name: string; icon: any; label: string }) => {
    const active = isTabActive(name);
    return (
      <TouchableOpacity
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate(name);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        <View
          style={{
            width: 42,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.primarySoft : 'transparent',
          }}
        >
          <Icon size={20} color={active ? colors.primary : colors.inkFaint} strokeWidth={active ? 2.2 : 1.8} />
        </View>
        <Text
          style={{
            fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium,
            fontSize: 10.5,
            marginTop: 3,
            letterSpacing: 0.2,
            color: active ? colors.ink : colors.inkFaint,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: 14,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {/* Floating dock */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 6,
          ...shadow.card,
        }}
      >
        <TabBtn name="index" icon={Home} label="Home" />
        <TabBtn name="accounts" icon={Wallet} label="Directory" />

        {/* Centre action */}
        <View style={{ width: 66, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -26,
              borderWidth: 4,
              borderColor: colors.bg,
              ...shadow.glow,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onFabPress();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create new entry"
          >
            <Plus size={26} color={colors.onPrimary} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <TabBtn name="business" icon={Plane} label="Business" />
        <TabBtn name="reports" icon={BarChart2} label="Reports" />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const handleFabPress = () => {
    sheetRef.current?.present();
  };

  return (
    <>
      <Tabs
        tabBar={props => <CustomTabBar {...props} onFabPress={handleFabPress} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="accounts" />
        <Tabs.Screen name="business" />
        <Tabs.Screen name="reports" />

        {/* Hidden from CustomTabBar but accessible via navigation */}
        <Tabs.Screen name="transactions" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
      <CreateTransactionSheet ref={sheetRef} />
    </>
  );
}
