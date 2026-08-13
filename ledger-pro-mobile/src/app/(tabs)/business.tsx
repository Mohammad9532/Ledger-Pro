import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Search, AlertCircle, Plane, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useBusinessItems } from '../../features/business/api/business';
import { BusinessItemCard } from '../../features/business/components/BusinessItemCard';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Items' },
  { id: 'purchased', label: 'Purchased' },
  { id: 'sold', label: 'Sold' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function BusinessScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isRefetching } = useBusinessItems(page, searchQuery, statusFilter);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border z-10">
        <Text className="text-white text-2xl font-bold mb-4">Business Items</Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-background rounded-xl px-4 py-3 border border-border mb-4">
          <Search size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search tickets, passengers, PNR..."
            placeholderTextColor="#64748b"
            className="flex-1 ml-3 text-white text-base"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setPage(1);
            }}
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => {
                setStatusFilter(filter.id);
                setPage(1);
              }}
              className={`mr-3 px-4 py-2 rounded-full border ${
                statusFilter === filter.id 
                  ? 'bg-primary-500 border-primary-500' 
                  : 'bg-slate-800/50 border-border'
              }`}
            >
              <Text className={`font-medium ${statusFilter === filter.id ? 'text-white' : 'text-slate-300'}`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="text-white text-center text-lg font-bold mb-2">Failed to load inventory</Text>
          <Text className="text-muted text-center text-sm">Please check your connection and try again.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <BusinessItemCard item={item} />}
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
                <Plane size={40} color="#64748b" />
              </View>
              <Text className="text-white text-lg font-bold mb-2">No business items found</Text>
              <Text className="text-muted text-center">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.' 
                  : 'You have no tickets in inventory.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg shadow-black"
        activeOpacity={0.8}
        onPress={() => router.push('/business/purchase')}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
