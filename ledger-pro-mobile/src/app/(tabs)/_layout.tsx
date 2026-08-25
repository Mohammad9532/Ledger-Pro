import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, Plus, BarChart2, Plane } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CreateTransactionSheet } from '../../features/transactions/components/CreateTransactionSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useUiStore } from '../../store/uiStore';

function CustomTabBar({ state, navigation, onFabPress }: { state: any; navigation: any; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  
  const isTabActive = (name: string) => state.routes[state.index].name === name;

  const TabBtn = ({ name, icon: Icon, label }: { name: string; icon: any; label: string }) => {
    const active = isTabActive(name);
    return (
      <TouchableOpacity
        className="flex-1 items-center justify-center pt-2"
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate(name);
        }}
      >
        <Icon size={22} color={active ? '#f97316' : '#64748b'} />
        <Text style={{ fontSize: 10, marginTop: 3, fontWeight: active ? '700' : '500', color: active ? '#f97316' : '#64748b' }}>
          {label}
        </Text>
        {active && (
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#f97316', marginTop: 3 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View 
      style={{
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 12),
      }}
    >
      <TabBtn name="index" icon={Home} label="Home" />
      <TabBtn name="accounts" icon={Wallet} label="Directory" />

      {/* Center FAB */}
      <View className="flex-1 items-center justify-center" style={{ marginTop: -20 }}>
        <TouchableOpacity
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#f97316',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#f97316',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 10,
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onFabPress();
          }}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <TabBtn name="business" icon={Plane} label="Business" />
      <TabBtn name="reports" icon={BarChart2} label="Reports" />
    </View>
  );
}

export default function TabsLayout() {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const { activeDirectoryTab } = useUiStore();

  const handleFabPress = (navigation: any, state: any) => {
    sheetRef.current?.present();
  };

  return (
    <>
      <Tabs 
        tabBar={props => <CustomTabBar {...props} onFabPress={() => handleFabPress(props.navigation, props.state)} />}
        screenOptions={{ headerShown: false }}
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
