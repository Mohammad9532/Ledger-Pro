import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../../utils/format';
import { DashboardSummary } from '../types/dashboard';

interface Props {
  summary: DashboardSummary;
}

export const SummaryCards = memo(function SummaryCards({ summary }: Props) {
  return (
    <View className="mb-6">
      {/* Hero Card: Total Balance */}
      <TouchableOpacity activeOpacity={0.9} accessibilityLabel="Current Balance">
        <LinearGradient
          colors={['#f97316', '#ea580c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl p-6 mb-4 shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-primary-50 font-medium">Current Balance</Text>
            <ChevronRight size={20} color="#fffedd" />
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight">
            {formatCurrency(summary.surplus)}
          </Text>
          {/* Trend placeholder - currently omitted as per requirements (no fabricated data) */}
        </LinearGradient>
      </TouchableOpacity>

      {/* Sub Cards: Cash & Bank */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-primary-500/10 items-center justify-center mb-3">
            <Wallet size={16} color="#f97316" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Cash</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.cash)}</Text>
        </View>

        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center mb-3">
            <Landmark size={16} color="#3b82f6" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Bank</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.bank)}</Text>
        </View>
      </View>

      {/* Sub Cards: Receivable & Payable */}
      <View className="flex-row gap-4">
        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center mb-3">
            <ArrowDownLeft size={16} color="#10b981" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">To Receive</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.receivable)}</Text>
        </View>

        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-danger/10 items-center justify-center mb-3">
            <ArrowUpRight size={16} color="#ef4444" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">To Pay</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.payable)}</Text>
        </View>
      </View>
    </View>
  );
});
