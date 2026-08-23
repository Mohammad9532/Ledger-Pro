import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { usePayables, ReceivablePayableRow } from '../api/reports';
import { formatCurrency } from '../../../utils/format';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { format } from 'date-fns';

export default function PayablesScreen() {
  const router = useRouter();
  
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, error } = usePayables(asOfDate);

  const renderRow = ({ item }: { item: ReceivablePayableRow }) => {
    // Payables balance comes in as negative, so we take absolute for display
    const amount = Math.abs(parseFloat(item.balance));

    return (
      <View className="flex-row items-center justify-between py-4 px-4 border-b border-border/50">
        <View>
          <Text className="text-white text-base font-medium">{item.name}</Text>
          {item.contact_id && (
            <Text className="text-muted text-xs mt-1">Contact #{item.contact_id}</Text>
          )}
        </View>
        <Text className="font-bold text-danger">
          {formatCurrency(amount, data?.currency)}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border z-10">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Payables</Text>
          <View style={{ width: 40 }} />
        </View>
        <DateRangeSelector 
          startDate={asOfDate} 
          onChange={(s) => setAsOfDate(s)} 
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
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-muted">No pending payables.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Footer */}
      {data && (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-6 shadow-2xl">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-300 font-bold text-lg">Total Payables</Text>
            <Text className="text-2xl font-black text-danger">
              {formatCurrency(Math.abs(parseFloat(data.total)), data.currency)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
