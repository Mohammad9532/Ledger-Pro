import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { formatCurrency } from '../../../utils/format';
import { PeriodSummary } from '../types/dashboard';

interface Props {
  monthly: {
    today: PeriodSummary;
    this_month: PeriodSummary;
  };
}

export const MonthlyOverview = memo(function MonthlyOverview({ monthly }: Props) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-white mb-3">This Month</Text>
      
      <View className="bg-card rounded-2xl p-5 border border-border">
        <View className="flex-row justify-between mb-4 border-b border-border pb-4">
          <View>
            <Text className="text-muted text-xs font-medium mb-1">Income</Text>
            <Text className="text-success text-lg font-bold">{formatCurrency(monthly.this_month.income)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-muted text-xs font-medium mb-1">Expenses</Text>
            <Text className="text-danger text-lg font-bold">{formatCurrency(monthly.this_month.expense)}</Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-muted text-sm font-medium">Net Profit</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-xl font-bold">{formatCurrency(monthly.this_month.profit)}</Text>
            {parseFloat(monthly.this_month.profit) >= 0 ? (
              <View className="bg-success/20 rounded-full p-1">
                <ArrowUp size={14} color="#10b981" />
              </View>
            ) : (
              <View className="bg-danger/20 rounded-full p-1">
                <ArrowDown size={14} color="#ef4444" />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});
