import React, { memo, useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MonthlyBreakdown } from '../types/dashboard';
import { getCurrencySymbol } from '../../../utils/format';
import { colors, fonts, radius, text } from '../../../theme';

interface Props {
  data: MonthlyBreakdown[];
}

export const DashboardChart = memo(function DashboardChart({ data }: Props) {
  const symbol = getCurrencySymbol();

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
      <View className="flex-row justify-between items-end mb-3">
        <Text style={text.sectionTitle}>Income vs expenses</Text>
        <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(198, 241, 59, 0.3)' }}>
          <Text style={{ fontFamily: fonts.monoMedium, fontSize: 10, color: colors.primary, letterSpacing: 1 }}>4 MONTHS</Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, paddingTop: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', overflow: 'hidden' }}>
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
          color1={colors.positive}
          color2={colors.negative}
          dataPointsColor1={colors.positive}
          dataPointsColor2={colors.negative}
          startFillColor1={colors.positive}
          startFillColor2={colors.negative}
          startOpacity1={0.35}
          startOpacity2={0.35}
          endFillColor1={colors.positive}
          endFillColor2={colors.negative}
          endOpacity1={0.03}
          endOpacity2={0.03}
          thickness1={2.5}
          thickness2={2.5}
          dataPointsRadius1={4}
          dataPointsRadius2={4}
          hideRules={false}
          rulesType="dashed"
          rulesColor={colors.border}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          yAxisTextStyle={{ color: colors.inkFaint, fontSize: 10, fontFamily: fonts.mono }}
          xAxisLabelTextStyle={{ color: colors.inkFaint, fontSize: 10, marginTop: 4, fontFamily: fonts.mono }}
          noOfSections={3}
          maxValue={maxValue}
          yAxisLabelPrefix={symbol}
          formatYLabel={(val) => {
            const num = parseFloat(val);
            if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
            return num.toString();
          }}
          pointerConfig={{
            pointerStripHeight: 140,
            pointerStripColor: colors.inkGhost,
            pointerStripWidth: 1,
            pointerColor: colors.ink,
            radius: 4,
            pointerLabelWidth: 130,
            pointerLabelHeight: 70,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any) => {
              if (!items || items.length === 0) return null;

              const income = items[0]?.value || 0;
              const expense = items[1]?.value || 0;

              return (
                <View
                  style={{
                    backgroundColor: colors.surface3,
                    borderColor: colors.borderStrong,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 12,
                    width: 120,
                    marginLeft: -48,
                    marginTop: -32,
                  }}
                >
                  <Text style={{ fontFamily: fonts.monoMedium, fontSize: 10, color: colors.inkMuted, letterSpacing: 1, marginBottom: 6 }}>
                    {String(items[0]?.label ?? '').toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: colors.positive }}>In</Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.positive }}>{symbol}{income.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: colors.negative }}>Out</Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.negative }}>{symbol}{expense.toLocaleString()}</Text>
                  </View>
                </View>
              );
            },
          }}
        />

        <View className="flex-row justify-center gap-8 mt-5">
          <View className="flex-row items-center gap-2">
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.positive }} />
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkMuted }}>Income</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.negative }} />
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkMuted }}>Expense</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
