import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { useIncomeSummary } from '../api/reports';
import { formatCurrency } from '../../../utils/format';

const COLORS = ['#3DD68C','#5AA9F5','#F2C14E','#A79BFF','#8F9BFF','#F072B6','#2FC7B0','#C6F13B'];

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
    <View style={{ flex: 1, backgroundColor: '#070E0C' }}>
      {/* Header */}
      <SafeAreaView>
        <View style={{ backgroundColor: '#0A1311', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#0F1B18' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={22} color="#E7F0EB" />
            </TouchableOpacity>
            <Text style={{ color: '#E7F0EB', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' }}>Income Summary</Text>
            <View style={{ width: 38 }} />
          </View>
          <DateRangeSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); if (e) setEndDate(e); }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#C6F13B" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#FF6B81', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Failed to load</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ backgroundColor: '#C6F13B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: '#0A1311', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Grand Total Card */}
          <View style={{ backgroundColor: '#0F1B18', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1F3129' }}>
            <Text style={{ color: '#9FB4AC', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>TOTAL INCOME</Text>
            <Text style={{ color: '#3DD68C', fontSize: 32, fontWeight: '800' }}>{formatCurrency(total)}</Text>
            {data?.period && (
              <Text style={{ color: '#5F776F', fontSize: 11, marginTop: 6 }}>
                {data.period.start} — {data.period.end}
              </Text>
            )}
          </View>

          {/* Source List */}
          {items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <TrendingUp size={48} color="#1F3129" />
              <Text style={{ color: '#7C948C', marginTop: 12, fontSize: 15 }}>No income in this period</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#0F1B18', borderRadius: 20, borderWidth: 1, borderColor: '#1F3129', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0A1311' }}>
                <Text style={{ flex: 1, color: '#7C948C', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Source</Text>
                <Text style={{ color: '#7C948C', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</Text>
              </View>
              {items.map((item, index) => {
                const pct = total > 0 ? (parseFloat(item.amount) / total) : 0;
                const color = COLORS[index % COLORS.length];
                const isLast = index === items.length - 1;
                return (
                  <View key={item.id} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#0A1311' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
                      <Text style={{ flex: 1, color: '#E7F0EB', fontWeight: '600', fontSize: 14 }}>{item.name}</Text>
                      <Text style={{ color: '#3DD68C', fontWeight: '700', fontSize: 14 }}>
                        {formatCurrency(parseFloat(item.amount))}
                      </Text>
                    </View>
                    <View style={{ height: 3, backgroundColor: '#0A1311', marginHorizontal: 16, marginBottom: 10, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: 3, backgroundColor: color, width: `${pct * 100}%`, borderRadius: 2 }} />
                    </View>
                  </View>
                );
              })}
              {/* Total Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(61,214,140,0.08)', borderTopWidth: 1, borderTopColor: '#1F3129' }}>
                <Text style={{ color: '#E7F0EB', fontWeight: '800', fontSize: 15 }}>Total</Text>
                <Text style={{ color: '#3DD68C', fontWeight: '800', fontSize: 15 }}>{formatCurrency(total)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
