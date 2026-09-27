import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '../../../components/AppButton';
import { BrandMark } from '../../../components/BrandMark';
import { colors, fonts, radius } from '../../../theme';

const Block = ({ w, h, r = 8, mb = 0 }: { w: number | string; h: number; r?: number; mb?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: colors.surface2, marginBottom: mb }} />
);

export function DashboardSkeleton() {
  return (
    <View className="flex-1 px-4 mt-4" accessibilityLabel="Loading dashboard">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 mt-10">
        <View>
          <Block w={110} h={14} mb={10} />
          <Block w={170} h={26} mb={10} />
          <Block w={90} h={12} />
        </View>
        <View className="flex-row gap-3">
          <Block w={40} h={40} r={20} />
          <Block w={42} h={42} r={21} />
        </View>
      </View>

      {/* Hero */}
      <Block w="100%" h={170} r={radius.xl} mb={14} />

      {/* Tiles */}
      <View className="flex-row gap-3 mb-3">
        <View style={{ flex: 1 }}><Block w="100%" h={118} r={radius.lg} /></View>
        <View style={{ flex: 1 }}><Block w="100%" h={118} r={radius.lg} /></View>
      </View>
      <View className="flex-row gap-3 mb-6">
        <View style={{ flex: 1 }}><Block w="100%" h={118} r={radius.lg} /></View>
        <View style={{ flex: 1 }}><Block w="100%" h={118} r={radius.lg} /></View>
      </View>

      {/* Monthly */}
      <Block w={120} h={20} mb={12} />
      <Block w="100%" h={150} r={radius.lg} />
    </View>
  );
}

export function DashboardEmptyState() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center p-6 mt-6">
      <View style={{ marginBottom: 24 }}>
        <BrandMark size={72} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, textAlign: 'center', letterSpacing: -0.4 }}>
        A clean ledger
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.inkMuted, textAlign: 'center', marginTop: 10, marginBottom: 32, lineHeight: 21 }}>
        Nothing has been recorded yet. Add your first income or expense and the dashboard will come to life.
      </Text>

      <View className="w-full gap-3">
        <AppButton title="Add income" variant="primary" onPress={() => router.push('/transactions/new?type=income' as any)} />
        <AppButton title="Add expense" variant="outline" onPress={() => router.push('/transactions/new?type=expense' as any)} />
      </View>
    </View>
  );
}
