import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { formatCurrency } from '../../../utils/format';
import { PeriodSummary } from '../types/dashboard';
import { format } from 'date-fns';

interface Props {
  monthly: {
    today: PeriodSummary;
    this_month: PeriodSummary;
  };
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

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#f8fafc' }}>This Month</Text>
        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>{monthName}</Text>
      </View>

      <View style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' }}>
        {/* Income Row */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TrendingUp size={14} color="#10b981" />
              <Text style={{ fontSize: 12, color: '#94a3b8', marginLeft: 5, fontWeight: '600' }}>Income</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#10b981', fontWeight: '700' }}>{formatCurrency(income)}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 5, backgroundColor: '#10b981', borderRadius: 3, width: `${incomeRatio * 100}%` }} />
          </View>
        </View>

        {/* Expense Row */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TrendingDown size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, color: '#94a3b8', marginLeft: 5, fontWeight: '600' }}>Expenses</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: '700' }}>{formatCurrency(expense)}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 5, backgroundColor: '#ef4444', borderRadius: 3, width: `${expenseRatio * 100}%` }} />
          </View>
        </View>

        {/* Net Profit Divider Row */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600' }}>Net Profit</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
              backgroundColor: isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isProfit ? '#10b981' : '#ef4444' }}>
                {isProfit ? '+' : ''}{income > 0 ? ((profit / income) * 100).toFixed(0) : 0}%
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: isProfit ? '#10b981' : '#ef4444' }}>
              {formatCurrency(profit)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});
