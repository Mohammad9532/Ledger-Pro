import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useContacts, Contact } from '../api/contacts';
import { formatCurrency } from '../../../utils/format';
import { Users, ChevronRight, ChevronDown, FileText, ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react-native';

interface Props {
  searchQuery: string;
}

export function ContactList({ searchQuery }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'active'|'archived'>('active');
  const { data: contacts, isLoading, refetch } = useContacts(activeTab);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [contacts, searchQuery]);

  const renderItem = ({ item }: { item: Contact }) => <ContactCard item={item} activeTab={activeTab} />;

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center pt-20 px-6">
      <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-6">
        <Users size={32} color="#64748b" />
      </View>
      <Text className="text-white text-lg font-bold mb-2">No contacts found</Text>
      <Text className="text-muted text-center">
        {searchQuery ? "We couldn't find anything matching your search." : "Add your first customer or supplier."}
      </Text>
    </View>
  );

  return (
    <View className="flex-1">
      <View className="flex-row mx-4 mt-2 mb-4 bg-slate-800 rounded-lg p-1">
        <TouchableOpacity 
          className={`flex-1 py-2 rounded-md items-center ${activeTab === 'active' ? 'bg-primary-500' : ''}`}
          onPress={() => setActiveTab('active')}
        >
          <Text className={`font-medium ${activeTab === 'active' ? 'text-white' : 'text-slate-400'}`}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2 rounded-md items-center ${activeTab === 'archived' ? 'bg-primary-500' : ''}`}
          onPress={() => setActiveTab('archived')}
        >
          <Text className={`font-medium ${activeTab === 'archived' ? 'text-white' : 'text-slate-400'}`}>Archived</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredContacts}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      ListEmptyComponent={!isLoading ? EmptyState : null}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />
      }
    />
    </View>
  );
}

function ContactCard({ item, activeTab }: { item: Contact; activeTab: 'active'|'archived' }) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);

  const balance = parseFloat(item.computed_balance);
  const balanceText = balance > 0 
    ? `Owes you ${formatCurrency(balance)}` 
    : balance < 0 
      ? `You owe ${formatCurrency(Math.abs(balance))}` 
      : 'Settled';
  const balanceColor = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-muted';

  return (
    <View className="bg-card mx-4 mb-3 rounded-xl border border-border overflow-hidden">
      <TouchableOpacity
        className="p-4 flex-row items-center active:bg-border/30"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View className="w-12 h-12 rounded-full bg-slate-800 items-center justify-center mr-4 border border-slate-700">
          <Users size={24} color="#a78bfa" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{item.name}</Text>
          <Text className={`${balanceColor} text-xs font-medium mt-1`}>{balanceText}</Text>
        </View>
        <View className="items-end">
          {expanded ? (
            <ChevronDown size={16} color="#64748b" />
          ) : (
            <ChevronRight size={16} color="#64748b" />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="flex-row bg-slate-800/50 border-t border-border flex-wrap">
          <TouchableOpacity 
            className="w-1/4 items-center justify-center py-3 border-r border-border"
            onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: item.id } })}
          >
            <FileText size={18} color="#94a3b8" />
            <Text className="text-white text-xs font-medium mt-1">Profile</Text>
          </TouchableOpacity>
          {activeTab === 'active' && (
            <>
              <TouchableOpacity 
                className="w-1/4 items-center justify-center py-3 border-r border-border"
                onPress={() => router.push(`/transactions/new?type=receive_money&person_id=${item.id}&person_name=${encodeURIComponent(item.name)}`)}
              >
                <ArrowDownLeft size={18} color="#10b981" />
                <Text className="text-success text-xs font-medium mt-1">Receive</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-1/4 items-center justify-center py-3 border-r border-border"
                onPress={() => router.push(`/transactions/new?type=give_money&person_id=${item.id}&person_name=${encodeURIComponent(item.name)}`)}
              >
                <ArrowUpRight size={18} color="#f97316" />
                <Text className="text-primary-500 text-xs font-medium mt-1">Give</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            className="w-1/4 items-center justify-center py-3"
            onPress={() => router.push(`/contacts/edit/${item.id}`)}
          >
            <Pencil size={18} color="#94a3b8" />
            <Text className="text-white text-xs font-medium mt-1">Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
