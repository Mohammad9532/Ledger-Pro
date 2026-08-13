import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { useIncomeSummary } from '../api/reports';
import { formatCurrency } from '../../../utils/format';

const COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#6366f1','#ec4899','#14b8a6','#f97316'];

export default function IncomeSummaryScreen() {
  const router = useRouter();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading, error, refetch } = useIncomeSummary(startDate, endDate);

  const items = data?.items ?? [];
  const total = parseFloat(data?.total ?? '0');

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      {/* Header */}
      <SafeAreaView>
        <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={22} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' }}>Income Summary</Text>
            <View style={{ width: 38 }} />
          </View>
          <DateRangeSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); if (e) setEndDate(e); }} />
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
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>TOTAL INCOME</Text>
            <Text style={{ color: '#10b981', fontSize: 32, fontWeight: '800' }}>{formatCurrency(total)}</Text>
            {data?.period && (
              <Text style={{ color: '#475569', fontSize: 11, marginTop: 6 }}>
                {data.period.start} — {data.period.end}
              </Text>
            )}
          </View>

          {/* Source List */}
          {items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <TrendingUp size={48} color="#334155" />
              <Text style={{ color: '#64748b', marginTop: 12, fontSize: 15 }}>No income in this period</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a' }}>
                <Text style={{ flex: 1, color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Source</Text>
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</Text>
              </View>
              {items.map((item, index) => {
                const pct = total > 0 ? (parseFloat(item.amount) / total) : 0;
                const color = COLORS[index % COLORS.length];
                const isLast = index === items.length - 1;
                return (
                  <View key={item.id} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#0f172a' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
                      <Text style={{ flex: 1, color: '#f8fafc', fontWeight: '600', fontSize: 14 }}>{item.name}</Text>
                      <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>
                        {formatCurrency(parseFloat(item.amount))}
                      </Text>
                    </View>
                    <View style={{ height: 3, backgroundColor: '#0f172a', marginHorizontal: 16, marginBottom: 10, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: 3, backgroundColor: color, width: `${pct * 100}%`, borderRadius: 2 }} />
                    </View>
                  </View>
                );
              })}
              {/* Total Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(16,185,129,0.08)', borderTopWidth: 1, borderTopColor: '#334155' }}>
                <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 15 }}>Total</Text>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 15 }}>{formatCurrency(total)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
