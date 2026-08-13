import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Search, AlertCircle, FileText } from 'lucide-react-native';
import { useTransactions } from '../../features/transactions/api/transactions';
import { TransactionItem } from '../../features/transactions/components/TransactionItem';

export default function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isRefetching } = useTransactions(page, searchQuery);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border z-10">
        <Text className="text-white text-2xl font-bold mb-4">General Ledger</Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-background rounded-xl px-4 py-3 border border-border">
          <Search size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search transactions..."
            placeholderTextColor="#64748b"
            className="flex-1 ml-3 text-white text-base"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setPage(1); // Reset to page 1 on search
            }}
          />
        </View>
      </View>

      {/* List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="text-white text-center text-lg font-bold mb-2">Failed to load transactions</Text>
          <Text className="text-muted text-center text-sm">Please check your connection and try again.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching && page === 1} 
              onRefresh={() => { setPage(1); refetch(); }}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <View className="bg-slate-800/50 p-4 rounded-full mb-4">
                <FileText size={40} color="#64748b" />
              </View>
              <Text className="text-white text-lg font-bold mb-2">No transactions found</Text>
              <Text className="text-muted text-center">
                {searchQuery ? 'Try adjusting your search filters.' : 'You have no transactions yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
