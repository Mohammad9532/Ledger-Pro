import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, Plus, BarChart2, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CreateTransactionSheet } from '../../features/transactions/components/CreateTransactionSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useUiStore } from '../../store/uiStore';

function CustomTabBar({ state, navigation, onFabPress }: { state: any; navigation: any; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className="flex-row bg-card border-t border-border px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10) }}
    >
      {/* Home */}
      <TouchableOpacity 
        className="flex-1 items-center justify-center"
        onPress={() => navigation.navigate('index')}
      >
        <Home size={24} color={state.index === 0 ? '#f97316' : '#94a3b8'} />
      </TouchableOpacity>
      
      {/* Accounts */}
      <TouchableOpacity 
        className="flex-1 items-center justify-center"
        onPress={() => navigation.navigate('accounts')}
      >
        <Wallet size={24} color={state.index === 1 ? '#f97316' : '#94a3b8'} />
      </TouchableOpacity>
      
      {/* Center Action */}
      <View className="flex-1 items-center justify-center">
        <TouchableOpacity 
          className="w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg -mt-6 border-4 border-background"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFabPress();
          }}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#fffedd" />
        </TouchableOpacity>
      </View>
      
      {/* Reports */}
      <TouchableOpacity 
        className="flex-1 items-center justify-center"
        onPress={() => navigation.navigate('reports')}
      >
        <BarChart2 size={24} color={state.index === 2 ? '#f97316' : '#94a3b8'} />
      </TouchableOpacity>
      
      {/* Settings */}
      <TouchableOpacity 
        className="flex-1 items-center justify-center"
        onPress={() => navigation.navigate('settings')}
      >
        <Settings size={24} color={state.index === 3 ? '#f97316' : '#94a3b8'} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const { activeDirectoryTab } = useUiStore();

  const handleFabPress = (navigation: any, state: any) => {
    // For Alpha testing, always open the transaction sheet from any tab.
    // The adaptive logic (New Account/Contact) will be restored in Phase 6.
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
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="settings" />
      </Tabs>
      <CreateTransactionSheet ref={sheetRef} />
    </>
  );
}
