import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { formatCurrency } from '../../../utils/format';
import { PeriodSummary } from '../types/dashboard';
import { format } from 'date-fns';
import { colors, fonts, radius, text } from '../../../theme';

interface Props {
  monthly: {
    today: PeriodSummary;
    this_month: PeriodSummary;
  };
}

function Row({ icon: Icon, label, amount, ratio, color }: { icon: any; label: string; amount: number; ratio: number; color: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon size={14} color={color} strokeWidth={2.2} />
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.inkMuted, marginLeft: 6 }}>{label}</Text>
        </View>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 14, color, fontVariant: ['tabular-nums'] }}>{formatCurrency(amount)}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 5, backgroundColor: color, borderRadius: 3, width: `${Math.round(ratio * 100)}%` }} />
      </View>
    </View>
  );
}

export const MonthlyOverview = memo(function MonthlyOverview({ monthly }: Props) {
  const income = parseFloat(monthly.this_month.income || '0');
  const expense = parseFloat(monthly.this_month.expense || '0');
  const profit = parseFloat(monthly.this_month.profit || '0');
  const isProfit = profit >= 0;
  const total = income + expense || 1;
  const incomeRatio = Math.min(income / total, 1);
  const expenseRatio = Math.min(expense / total, 1);
  const monthName = format(new Date(), 'MMMM yyyy');
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;
  const tone = isProfit ? colors.positive : colors.negative;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <Text style={text.sectionTitle}>This month</Text>
        <Text style={text.mono}>{monthName}</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.border }}>
        <Row icon={TrendingUp} label="Income" amount={income} ratio={incomeRatio} color={colors.positive} />
        <Row icon={TrendingDown} label="Expenses" amount={expense} ratio={expenseRatio} color={colors.negative} />

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.inkMuted }}>Net profit</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: isProfit ? colors.positiveSoft : colors.negativeSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, color: tone }}>
                {isProfit ? '+' : ''}{margin}%
              </Text>
            </View>
            <Text style={[text.figure, { fontSize: 22, lineHeight: 26, color: tone }]}>{formatCurrency(profit)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
