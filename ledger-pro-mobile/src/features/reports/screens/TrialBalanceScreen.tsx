import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTrialBalance, TrialBalanceRow } from '../api/reports';
import { formatCurrency, formatDate } from '../../../utils/format';

export default function TrialBalanceScreen() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useTrialBalance(date);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchQuery.trim()) return data.rows;
    const query = searchQuery.toLowerCase();
    return data.rows.filter(row => 
      row.account_name.toLowerCase().includes(query) || 
      row.account_type.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const renderRow = ({ item }: { item: TrialBalanceRow }) => {
    const debit = parseFloat(item.debit);
    const credit = parseFloat(item.credit);

    return (
      <View className="flex-row items-center py-4 border-b border-border px-4">
        <View className="flex-1">
          <Text className="text-white font-medium text-base mb-1">{item.account_name}</Text>
          <Text className="text-muted text-xs capitalize">{item.account_type.replace(/_/g, ' ')}</Text>
        </View>
        <View className="flex-row items-center justify-end flex-1">
          <View className="flex-1 items-end pr-2 border-r border-border">
            <Text className={`font-medium ${debit > 0 ? 'text-white' : 'text-slate-600'}`}>
              {debit > 0 ? formatCurrency(debit) : '-'}
            </Text>
          </View>
          <View className="flex-1 items-end pl-2">
            <Text className={`font-medium ${credit > 0 ? 'text-white' : 'text-slate-600'}`}>
              {credit > 0 ? formatCurrency(credit) : '-'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View className="flex-row items-center py-2 border-b border-border px-4 bg-slate-800/50">
      <Text className="flex-1 text-muted text-xs font-medium uppercase tracking-wider">Account</Text>
      <View className="flex-row items-center justify-end flex-1">
        <Text className="flex-1 text-right text-muted text-xs font-medium uppercase tracking-wider pr-2">Debit</Text>
        <Text className="flex-1 text-right text-muted text-xs font-medium uppercase tracking-wider pl-2">Credit</Text>
      </View>
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
          <Text className="text-white text-lg font-bold">Trial Balance</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-background rounded-xl px-4 py-3 border border-border">
          <Search size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search accounts..."
            placeholderTextColor="#64748b"
            className="flex-1 ml-3 text-white text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
        <FlatList
          data={filteredRows}
          keyExtractor={item => item.account_id.toString()}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-muted">No accounts found matching your search.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Footer */}
      {data && (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-2xl">
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted font-medium">Debits</Text>
            <Text className="text-white font-bold">{data.currency} {formatCurrency(parseFloat(data.total_debit))}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-muted font-medium">Credits</Text>
            <Text className="text-white font-bold">{data.currency} {formatCurrency(parseFloat(data.total_credit))}</Text>
          </View>
          
          <View className="flex-row items-center justify-between pt-4 border-t border-slate-700/50">
            <View className="flex-row items-center">
              {data.is_balanced ? (
                <>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text className="text-success font-bold ml-2">Balanced</Text>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#ef4444" />
                  <Text className="text-danger font-bold ml-2">Not Balanced</Text>
                </>
              )}
            </View>
            <Text className="text-muted text-xs">As of: {formatDate(data.as_of)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
