import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAccounts, Account, VISIBLE_ACCOUNT_TYPES } from '../api/accounts';
import { formatCurrency } from '../../../utils/format';
import { Landmark, CreditCard, Banknote, Briefcase, ChevronRight, ChevronDown, Wallet, FileText, Plus, Pencil, Box, Scale } from 'lucide-react-native';

interface Props {
  searchQuery: string;
}

export function AccountList({ searchQuery }: Props) {
  const router = useRouter();
  const { data: accounts, isLoading, refetch } = useAccounts();

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter((a) => !a.is_system && VISIBLE_ACCOUNT_TYPES.includes(a.type))
      .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [accounts, searchQuery]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark size={24} color="#60a5fa" />;
      case 'credit_card': return <CreditCard size={24} color="#f472b6" />;
      case 'cash': return <Banknote size={24} color="#4ade80" />;
      default: return <Briefcase size={24} color="#94a3b8" />;
    }
  };

  const renderItem = ({ item }: { item: Account }) => <AccountCard item={item} getIcon={getIcon} />;

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center pt-20 px-6">
      <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-6">
        <Wallet size={32} color="#64748b" />
      </View>
      <Text className="text-white text-lg font-bold mb-2">No accounts found</Text>
      <Text className="text-muted text-center">
        {searchQuery ? "We couldn't find anything matching your search." : "Create your first Cash or Bank account to get started."}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filteredAccounts}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      ListEmptyComponent={!isLoading ? EmptyState : null}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />
      }
    />
  );
}

function AccountCard({ item, getIcon }: { item: Account, getIcon: (t: string) => React.ReactNode }) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View className="bg-card mx-4 mb-3 rounded-xl border border-border overflow-hidden">
      <TouchableOpacity
        className="p-4 flex-row items-center active:bg-border/30"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View className="w-12 h-12 rounded-full bg-slate-800 items-center justify-center mr-4 border border-slate-700">
          {getIcon(item.type)}
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{item.name}</Text>
          <Text className="text-muted text-xs capitalize mt-1">{item.type.replace(/_/g, ' ')}</Text>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-lg ${parseFloat(item.computed_balance) < 0 ? 'text-danger' : 'text-white'}`}>
            {formatCurrency(parseFloat(item.computed_balance))}
          </Text>
          {expanded ? (
            <ChevronDown size={16} color="#64748b" className="mt-1" />
          ) : (
            <ChevronRight size={16} color="#64748b" className="mt-1" />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="flex-row bg-slate-800/50 border-t border-border">
          <TouchableOpacity 
            className="flex-1 items-center justify-center py-3 border-r border-border"
            onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: item.id } })}
          >
            <FileText size={18} color="#94a3b8" />
            <Text className="text-white text-xs font-medium mt-1">Statement</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center justify-center py-3 border-r border-border"
            onPress={() => router.push(`/transactions/new?type=expense&account_id=${item.id}&account_name=${encodeURIComponent(item.name)}&account_type=${item.type}`)}
          >
            <Plus size={18} color="#f97316" />
            <Text className="text-primary-500 text-xs font-medium mt-1">New Txn</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center justify-center py-3"
            onPress={() => {
              // TODO: Implement Edit Account modal/screen
              console.log('Edit Account:', item.id);
            }}
          >
            <Pencil size={18} color="#94a3b8" />
            <Text className="text-white text-xs font-medium mt-1">Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
