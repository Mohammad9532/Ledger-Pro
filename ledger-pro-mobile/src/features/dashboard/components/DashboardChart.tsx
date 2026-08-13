import React, { memo, useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MonthlyBreakdown } from '../types/dashboard';

interface Props {
  data: MonthlyBreakdown[];
}

export const DashboardChart = memo(function DashboardChart({ data }: Props) {
  const { incomeData, expenseData, maxValue } = useMemo(() => {
    const currentMonthIndex = new Date().getMonth();
    const recentData = data.slice(0, currentMonthIndex + 1).slice(-4);
    
    const incomeData = recentData.map(item => ({
      value: parseFloat(item.income) || 0,
      label: item.month_name.substring(0, 3),
    }));
    
    const expenseData = recentData.map(item => ({
      value: parseFloat(item.expense) || 0,
      label: item.month_name.substring(0, 3),
    }));

    const maxVal = Math.max(
      ...incomeData.map(d => d.value),
      ...expenseData.map(d => d.value)
    );

    return { incomeData, expenseData, maxValue: maxVal > 0 ? maxVal * 1.2 : 100 };
  }, [data]);

  if (!incomeData || incomeData.length === 0) return null;

  const screenWidth = Dimensions.get('window').width;
  // Calculate spacing so 4 points fit perfectly (3 intervals)
  const chartSpacing = Math.max((screenWidth - 140) / 3, 50);

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-white">Income vs Expenses</Text>
        <View className="bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
          <Text className="text-primary-500 text-xs font-bold">4 Months</Text>
        </View>
      </View>
      
      <View className="bg-card rounded-2xl p-4 pt-6 border border-border items-center overflow-hidden">
        <LineChart
          areaChart
          curved
          isAnimated
          animationDuration={1200}
          data={incomeData}
          data2={expenseData}
          height={130}
          width={screenWidth - 90}
          spacing={chartSpacing}
          initialSpacing={20}
          color1="#10b981"
          color2="#ef4444"
          dataPointsColor1="#10b981"
          dataPointsColor2="#ef4444"
          startFillColor1="#10b981"
          startFillColor2="#ef4444"
          startOpacity1={0.4}
          startOpacity2={0.4}
          endFillColor1="#10b981"
          endFillColor2="#ef4444"
          endOpacity1={0.05}
          endOpacity2={0.05}
          thickness1={3}
          thickness2={3}
          dataPointsRadius1={4}
          dataPointsRadius2={4}
          hideRules={false}
          rulesType="dashed"
          rulesColor="#334155"
          xAxisColor="#334155"
          yAxisColor="transparent"
          yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}
          noOfSections={3}
          maxValue={maxValue}
          yAxisLabelPrefix="₹"
          formatYLabel={(val) => {
            const num = parseFloat(val);
            if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
            return num.toString();
          }}
          pointerConfig={{
            pointerStripHeight: 140,
            pointerStripColor: '#64748b',
            pointerStripWidth: 2,
            pointerColor: '#94a3b8',
            radius: 4,
            pointerLabelWidth: 120,
            pointerLabelHeight: 70,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any) => {
              if (!items || items.length === 0) return null;
              
              const income = items[0]?.value || 0;
              const expense = items[1]?.value || 0;
              
              return (
                <View className="bg-slate-800 border border-slate-700 p-2 rounded-xl shadow-lg w-[110px] items-center -ml-12 -mt-8">
                  <Text className="text-slate-400 text-xs font-bold mb-1">{items[0]?.label}</Text>
                  <View className="flex-row items-center justify-between w-full mb-1">
                    <Text className="text-emerald-500 text-xs font-bold">Inc:</Text>
                    <Text className="text-emerald-400 text-xs font-bold">₹{income.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row items-center justify-between w-full">
                    <Text className="text-red-500 text-xs font-bold">Exp:</Text>
                    <Text className="text-red-400 text-xs font-bold">₹{expense.toLocaleString()}</Text>
                  </View>
                </View>
              );
            },
          }}
        />
        
        <View className="flex-row justify-center gap-8 mt-5">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-[#10b981]" style={{ shadowColor: '#10b981', shadowOpacity: 0.5, shadowRadius: 4 }} />
            <Text className="text-slate-300 text-xs font-medium">Income</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-[#ef4444]" style={{ shadowColor: '#ef4444', shadowOpacity: 0.5, shadowRadius: 4 }} />
            <Text className="text-slate-300 text-xs font-medium">Expense</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
