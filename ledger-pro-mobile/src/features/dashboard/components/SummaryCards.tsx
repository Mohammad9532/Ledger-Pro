import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight, ChevronRight, Briefcase, CreditCard, Building } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../../utils/format';
import { DashboardSummary } from '../types/dashboard';

interface Props {
  summary: DashboardSummary;
}

export const SummaryCards = memo(function SummaryCards({ summary }: Props) {
  return (
    <View className="mb-6">
      {/* Hero Card: Total Surplus */}
      <TouchableOpacity activeOpacity={0.9} accessibilityLabel="Total Surplus">
        <LinearGradient
          colors={['#f97316', '#ea580c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-primary-50 font-medium">Total Assets</Text>
            <ChevronRight size={20} color="#fffedd" />
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight mb-4">
            {formatCurrency((parseFloat(summary.surplus || '0') + parseFloat(summary.asset || '0')).toString())}
          </Text>

          {/* Breakdown: Surplus & Assets */}
          <View className="flex-row justify-between border-t border-white/20 pt-4 mt-2">
            <View>
              <Text className="text-primary-100 text-xs font-medium uppercase tracking-wider mb-1">Surplus</Text>
              <Text className="text-white font-bold">{formatCurrency(summary.surplus || '0')}</Text>
            </View>
            <View className="items-end">
              <Text className="text-primary-100 text-xs font-medium uppercase tracking-wider mb-1">Assets</Text>
              <Text className="text-white font-bold">{formatCurrency(summary.asset || '0')}</Text>
            </View>
          </View>
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
      <View className="flex-row gap-4 mb-4">
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

      {/* Sub Cards: Assets & Business */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-teal-500/10 items-center justify-center mb-3">
            <Building size={16} color="#14b8a6" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Assets</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.asset || '0')}</Text>
        </View>

        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-indigo-500/10 items-center justify-center mb-3">
            <Briefcase size={16} color="#6366f1" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Business</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.business || '0')}</Text>
        </View>
      </View>

      {/* Sub Cards: Credit Card & Liabilities */}
      <View className="flex-row gap-4">
        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-pink-500/10 items-center justify-center mb-3">
            <CreditCard size={16} color="#ec4899" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Credit Cards</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.credit_card || '0')}</Text>
        </View>

        <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
          <View className="w-8 h-8 rounded-full bg-rose-500/10 items-center justify-center mb-3">
            <ArrowUpRight size={16} color="#f43f5e" />
          </View>
          <Text className="text-muted text-xs font-medium mb-1">Liabilities</Text>
          <Text className="text-white text-lg font-bold">{formatCurrency(summary.liability || '0')}</Text>
        </View>
      </View>
    </View>
  );
});
