import React, { memo, useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { MonthlyBreakdown } from '../types/dashboard';

interface Props {
  data: MonthlyBreakdown[];
}

export const DashboardChart = memo(function DashboardChart({ data }: Props) {
  const chartData = useMemo(() => {
    // Take the last 6 months to keep it compact
    const recentData = data.slice(-6);
    const formattedData: any[] = [];

    recentData.forEach((item) => {
      // Income Bar
      formattedData.push({
        value: parseFloat(item.income),
        frontColor: '#10b981', // success
        spacing: 4,
        label: item.month_name,
      });
      // Expense Bar
      formattedData.push({
        value: parseFloat(item.expense),
        frontColor: '#ef4444', // danger
      });
    });

    return formattedData;
  }, [data]);

  if (!chartData || chartData.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-white">Income vs Expenses</Text>
        <View className="bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
          <Text className="text-primary-500 text-xs font-bold">6 Months</Text>
        </View>
      </View>
      <View className="bg-card rounded-2xl p-4 border border-border items-center overflow-hidden">
        <BarChart
          data={chartData}
          barWidth={12}
          spacing={24}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
          noOfSections={3}
          maxValue={Math.max(...chartData.map(d => d.value)) * 1.2 || 100}
          yAxisLabelPrefix="₹"
          formatYLabel={(val) => {
            const num = parseFloat(val);
            if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
            return num.toString();
          }}
          rulesColor="#334155"
          xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
          height={90} // Reduced height by ~25%
          width={Dimensions.get('window').width - 110}
        />
        <View className="flex-row justify-center gap-6 mt-4">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-success" />
            <Text className="text-muted text-xs">Income</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-danger" />
            <Text className="text-muted text-xs">Expense</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
