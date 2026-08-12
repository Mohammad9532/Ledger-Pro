import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useAccountStatement, StatementEntry } from '../../features/accounts/api/accounts';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AccountStatementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAccountStatement(Number(id));

  const allEntries = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.statement.data);
  }, [data]);

  const account = data?.pages[0]?.account;

  const renderHeader = () => {
    if (!account) return null;
    return (
      <View className="mb-4 bg-card rounded-2xl p-6 border border-border mt-4 mx-4">
        <Text className="text-muted text-sm font-medium mb-1 capitalize">
          {account.type.replace(/_/g, ' ')} Account
        </Text>
        <Text className="text-white text-3xl font-bold mb-4">
          {formatCurrency(parseFloat(account.computed_balance))}
        </Text>

        <View className="flex-row gap-3">
          <TouchableOpacity className="flex-1 bg-slate-800 rounded-xl py-3 items-center border border-slate-700">
            <Text className="text-white font-medium">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-primary-500 rounded-xl py-3 items-center">
            <Text className="text-white font-bold">New Txn</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEntry = ({ item }: { item: StatementEntry }) => {
    const isCredit = parseFloat(item.credit) > 0;
    const amount = isCredit ? item.credit : item.debit;
    
    return (
      <View className="bg-card px-4 py-4 border-b border-border">
        <View className="flex-row justify-between mb-1">
          <Text className="text-white font-medium flex-1 mr-2" numberOfLines={1}>
            {item.description}
          </Text>
          <Text className={`font-bold ${isCredit ? 'text-success' : 'text-white'}`}>
            {isCredit ? '+' : '-'}{formatCurrency(parseFloat(amount))}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-xs">{formatDate(item.date)}</Text>
          <Text className="text-muted text-xs">Balance: {formatCurrency(parseFloat(item.balance))}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 bg-card border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">{account?.name || 'Account Statement'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={allEntries}
        keyExtractor={(item) => item.transaction_id.toString()}
        renderItem={renderEntry}
        ListHeaderComponent={renderHeader}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#f97316" />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}
