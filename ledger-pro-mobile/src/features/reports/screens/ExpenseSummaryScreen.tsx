import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Switch, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingDown } from 'lucide-react-native';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { useExpenseSummary } from '../api/reports';
import { formatCurrency } from '../../../utils/format';

const COLORS = ['#ef4444','#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

export default function ExpenseSummaryScreen() {
  const router = useRouter();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [includeBusiness, setIncludeBusiness] = useState(false);

  const { data, isLoading, error, refetch } = useExpenseSummary(startDate, endDate, includeBusiness);

  const categories = data?.categories ?? [];
  const grandTotal = parseFloat(data?.grand_total ?? '0');

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      {/* Header */}
      <SafeAreaView>
        <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={22} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' }}>Expense Summary</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Date Range */}
          <DateRangeSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); if (e) setEndDate(e); }} />

          {/* Toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#1e293b', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>Include Business Expenses</Text>
            <Switch
              value={includeBusiness}
              onValueChange={setIncludeBusiness}
              trackColor={{ false: '#334155', true: '#f97316' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Failed to load</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ backgroundColor: '#f97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Grand Total Card */}
          <View style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>TOTAL EXPENSES</Text>
            <Text style={{ color: '#ef4444', fontSize: 32, fontWeight: '800' }}>{formatCurrency(grandTotal)}</Text>
            {data?.period && (
              <Text style={{ color: '#475569', fontSize: 11, marginTop: 6 }}>
                {data.period.start} — {data.period.end}
              </Text>
            )}
          </View>

          {/* Category List */}
          {categories.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <TrendingDown size={48} color="#334155" />
              <Text style={{ color: '#64748b', marginTop: 12, fontSize: 15 }}>No expenses in this period</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a' }}>
                <Text style={{ flex: 1, color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', width: 40, textAlign: 'center', letterSpacing: 0.5 }}>Txns</Text>
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', width: 90, textAlign: 'right', letterSpacing: 0.5 }}>Total</Text>
              </View>
              {categories.map((cat, index) => {
                const pct = grandTotal > 0 ? (parseFloat(cat.total) / grandTotal) : 0;
                const color = COLORS[index % COLORS.length];
                const isLast = index === categories.length - 1;
                return (
                  <View key={index} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#0f172a' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
                      <Text style={{ flex: 1, color: '#f8fafc', fontWeight: '600', fontSize: 14 }}>
                        {cat.category_name ?? 'Uncategorized'}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 13, width: 40, textAlign: 'center' }}>{cat.count}</Text>
                      <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14, width: 90, textAlign: 'right' }}>
                        {formatCurrency(parseFloat(cat.total))}
                      </Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 3, backgroundColor: '#0f172a', marginHorizontal: 16, marginBottom: 10, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: 3, backgroundColor: color, width: `${pct * 100}%`, borderRadius: 2 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
