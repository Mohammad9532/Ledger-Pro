import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WifiOff, CloudOff } from 'lucide-react-native';

import { useDashboard } from '../../features/dashboard/api/getDashboard';
import { DashboardHeader } from '../../features/dashboard/components/DashboardHeader';
import { SummaryCards } from '../../features/dashboard/components/SummaryCards';
import { MonthlyOverview } from '../../features/dashboard/components/MonthlyOverview';
import { QuickActions } from '../../features/dashboard/components/QuickActions';
import { DashboardChart } from '../../features/dashboard/components/DashboardChart';
import { RecentActivity } from '../../features/dashboard/components/RecentActivity';
import { DashboardSkeleton, DashboardEmptyState } from '../../features/dashboard/components/DashboardStates';
import { AppButton } from '../../components/AppButton';
import { useOnline } from '../../lib/queryClient';
import { formatRelativeTime } from '../../utils/format';
import { colors, fonts } from '../../theme';

export default function DashboardScreen() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const online = useOnline();
  const isOffline = !online;

  const onRefresh = useCallback(async () => {
    if (isOffline) return;
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch, isOffline]);

  const lastSynced = dataUpdatedAt ? formatRelativeTime(new Date(dataUpdatedAt).toISOString()) : null;

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (isError && !data) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-8">
        {isOffline ? <CloudOff size={44} color={colors.inkMuted} /> : <WifiOff size={44} color={colors.negative} />}
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: 18, textAlign: 'center' }}>
          {isOffline ? "You're offline" : 'Connection error'}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          {isOffline
            ? 'Connect to the internet once to load your ledger. After that it stays available offline.'
            : 'Could not reach the server. Check your connection and try again.'}
        </Text>
        <View style={{ marginTop: 22, alignSelf: 'stretch' }}>
          <AppButton title="Try again" variant="outline" onPress={() => refetch()} disabled={isOffline} />
        </View>
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 16,
          }}
        >
          <CloudOff size={14} color={colors.inkMuted} />
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkMuted }}>
            Offline{lastSynced ? ` · showing data saved ${lastSynced}` : ''}
          </Text>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={data ? <RecentActivity transactions={data.recent_transactions} /> : null}
      />
    </View>
  );
}
