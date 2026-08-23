import React, { useState } from 'react';
import { View, Text, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useCashFlow, CashFlowRow } from '../api/reports';
import { formatCurrency } from '../../../utils/format';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { format, subDays } from 'date-fns';

export default function CashFlowScreen() {
  const router = useRouter();
  
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, error } = useCashFlow(startDate, endDate);

  const sections = data ? [
    { title: 'Operating Activities', data: data.operating_activities, total: parseFloat(data.net_operating_cash_flow) },
    { title: 'Investing Activities', data: data.investing_activities, total: parseFloat(data.net_investing_cash_flow) },
    { title: 'Financing Activities', data: data.financing_activities, total: parseFloat(data.net_financing_cash_flow) },
  ].filter(section => section.data.length > 0) : [];

  const renderRow = ({ item }: { item: CashFlowRow }) => {
    const amount = parseFloat(item.amount);
    const isPositive = amount >= 0;

    return (
      <View className="flex-row items-center justify-between py-3 px-4 border-b border-border/50">
        <Text className="text-white text-base">{item.account_name}</Text>
        <Text className={`font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : ''}{formatCurrency(amount, data?.currency)}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-slate-800/80 px-4 py-2 mt-4 flex-row justify-between items-center border-y border-border">
      <Text className="text-muted text-xs font-bold uppercase tracking-wider">{section.title}</Text>
      <Text className="text-muted text-xs font-bold">{formatCurrency(section.total, data?.currency)}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border z-10">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Cash Flow</Text>
          <View style={{ width: 40 }} />
        </View>
        <DateRangeSelector 
          startDate={startDate} 
          endDate={endDate} 
          onChange={(s, e) => { setStartDate(s); if(e) setEndDate(e); }} 
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="text-white text-center text-lg font-bold mb-2">Failed to load report</Text>
          <Text className="text-muted text-center text-sm">Please check your connection and try again.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.account_id.toString() + index}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 160 }}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-muted">No cash flow activity in this period.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Footer */}
      {data && (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-5 shadow-2xl">
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted font-medium">Opening Balance</Text>
            <Text className="text-white font-medium">{formatCurrency(parseFloat(data.opening_balance), data.currency)}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-muted font-medium">Net Cash Flow</Text>
            <Text className={`font-bold ${parseFloat(data.net_cash_flow) >= 0 ? 'text-success' : 'text-danger'}`}>
              {parseFloat(data.net_cash_flow) >= 0 ? '+' : ''}{formatCurrency(parseFloat(data.net_cash_flow), data.currency)}
            </Text>
          </View>
          
          <View className="flex-row items-center justify-between pt-4 border-t border-slate-700/50">
            <Text className="text-slate-300 font-bold text-lg">Closing Balance</Text>
            <Text className="text-2xl font-black text-white">
              {formatCurrency(parseFloat(data.closing_balance), data.currency)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
