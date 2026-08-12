import React, { useCallback, useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

import { useDashboard } from '../../features/dashboard/api/getDashboard';
import { DashboardHeader } from '../../features/dashboard/components/DashboardHeader';
import { SummaryCards } from '../../features/dashboard/components/SummaryCards';
import { MonthlyOverview } from '../../features/dashboard/components/MonthlyOverview';
import { QuickActions } from '../../features/dashboard/components/QuickActions';
import { DashboardChart } from '../../features/dashboard/components/DashboardChart';
import { RecentActivity } from '../../features/dashboard/components/RecentActivity';
import { DashboardSkeleton, DashboardEmptyState } from '../../features/dashboard/components/DashboardStates';

export default function DashboardScreen() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const onRefresh = useCallback(async () => {
    if (isOffline) return;
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch, isOffline]);

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (isError && !data) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-4">
        <WifiOff size={48} color="#ef4444" />
        <Text className="text-white text-lg font-bold mt-4">Connection Error</Text>
        <Text className="text-muted text-center mt-2">Could not connect to the server.</Text>
      </View>
    );
  }

  if (data && data.recent_transactions.length === 0 && parseFloat(data.summary.surplus) === 0) {
    return (
      <View className="flex-1 bg-background px-4">
        <DashboardHeader />
        <DashboardEmptyState />
      </View>
    );
  }

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(600).springify()}>
      <DashboardHeader />
      {isOffline && (
        <View className="bg-danger/20 p-2 rounded-lg mb-4 flex-row justify-center items-center gap-2">
          <WifiOff size={14} color="#ef4444" />
          <Text className="text-danger text-xs font-bold">You are offline. Showing cached data.</Text>
        </View>
      )}
      {data && (
        <>
          <SummaryCards summary={data.summary} />
          <MonthlyOverview monthly={data.monthly} />
          <DashboardChart data={data.charts.monthly_breakdown} />
          <QuickActions actions={data.quick_actions} />
        </>
      )}
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        className="px-4"
        data={[]}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#f97316"
            colors={['#f97316']}
          />
        }
        ListFooterComponent={data ? <RecentActivity transactions={data.recent_transactions} /> : null}
      />
    </View>
  );
}
