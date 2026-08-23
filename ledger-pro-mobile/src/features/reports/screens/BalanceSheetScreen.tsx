import React, { useState } from 'react';
import { View, Text, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useBalanceSheet, BalanceSheetRow } from '../api/reports';
import { formatCurrency, formatDate } from '../../../utils/format';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { format } from 'date-fns';

export default function BalanceSheetScreen() {
  const router = useRouter();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, error } = useBalanceSheet(date);

  const sections = data ? [
    { title: 'Current Assets', data: data.current_assets, total: parseFloat(data.total_current_assets) },
    { title: 'Non-Current Assets', data: data.non_current_assets, total: parseFloat(data.total_non_current_assets) },
    { title: 'Current Liabilities', data: data.current_liabilities, total: parseFloat(data.total_current_liabilities) },
    { title: 'Non-Current Liabilities', data: data.non_current_liabilities, total: parseFloat(data.total_non_current_liabilities) },
    { title: 'Equity', data: data.equity, total: parseFloat(data.total_equity) },
  ].filter(section => section.data.length > 0) : [];

  const renderRow = ({ item }: { item: BalanceSheetRow }) => {
    const amount = parseFloat(item.balance);

    return (
      <View className="flex-row items-center justify-between py-3 px-4 border-b border-border/50">
        <Text className="text-white text-base">{item.name}</Text>
        <Text className="text-white font-medium">
          {formatCurrency(amount, data?.currency)}
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
          <Text className="text-white text-lg font-bold">Balance Sheet</Text>
          <View style={{ width: 40 }} />
        </View>
        <DateRangeSelector 
          startDate={date} 
          onChange={(s) => setDate(s)} 
          singleDateOnly={true} 
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
          keyExtractor={(item, index) => item.id.toString() + index}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 160 }}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-muted">No balances available.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Footer */}
      {data && (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-5 shadow-2xl">
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted font-medium">Total Assets</Text>
            <Text className="text-white font-bold">{formatCurrency(parseFloat(data.total_assets), data.currency)}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-muted font-medium">Total Liabilities & Equity</Text>
            <Text className="text-white font-bold">{formatCurrency(parseFloat(data.total_liabilities_and_equity), data.currency)}</Text>
          </View>
          
          <View className="flex-row items-center justify-between pt-4 border-t border-slate-700/50">
            <View className="flex-row items-center">
              {data.is_balanced ? (
                <>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text className="text-success font-bold ml-2">In Balance</Text>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#ef4444" />
                  <Text className="text-danger font-bold ml-2">
                    Difference: {formatCurrency(parseFloat(data.difference), data.currency)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
