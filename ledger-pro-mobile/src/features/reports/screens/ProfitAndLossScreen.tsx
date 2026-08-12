import React, { useState } from 'react';
import { View, Text, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useProfitAndLoss, ProfitAndLossRow } from '../api/reports';
import { formatCurrency } from '../../../utils/format';

export default function ProfitAndLossScreen() {
  const router = useRouter();
  
  // Hardcoded date range for MVP. Can be replaced with a date picker later.
  const [startDate] = useState('2026-07-01');
  const [endDate] = useState('2026-07-31');

  const { data, isLoading, error } = useProfitAndLoss(startDate, endDate);

  const sections = data ? [
    { title: 'Income', data: data.income, total: parseFloat(data.total_income), isIncome: true },
    { title: 'Expenses', data: data.expenses, total: parseFloat(data.total_expense), isIncome: false }
  ] : [];

  const renderRow = ({ item, section }: { item: ProfitAndLossRow, section: any }) => {
    const amount = parseFloat(item.amount);

    return (
      <View className="flex-row items-center justify-between py-3 px-4 border-b border-border/50">
        <Text className="text-white text-base">{item.account_name}</Text>
        <Text className={`font-medium ${section.isIncome ? 'text-success' : 'text-white'}`}>
          {formatCurrency(amount)}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-slate-800/80 px-4 py-2 mt-4 flex-row justify-between items-center border-y border-border">
      <Text className="text-muted text-xs font-bold uppercase tracking-wider">{section.title}</Text>
      <Text className="text-muted text-xs font-bold">{formatCurrency(section.total)}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border z-10">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Profit & Loss</Text>
          <View style={{ width: 40 }} />
        </View>
        <View className="flex-row justify-center">
          <Text className="text-muted text-sm">{startDate}  to  {endDate}</Text>
        </View>
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
          keyExtractor={(item) => item.account_id.toString()}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-muted">No activity in this period.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Footer */}
      {data && (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-5 shadow-2xl">
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-300 font-bold text-lg">Net Profit</Text>
            <View className="items-end">
              <Text className={`text-2xl font-black ${parseFloat(data.net_profit) >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.currency} {formatCurrency(Math.abs(parseFloat(data.net_profit)))}
              </Text>
              {parseFloat(data.net_profit) < 0 && (
                <Text className="text-danger text-xs mt-1">Net Loss</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
