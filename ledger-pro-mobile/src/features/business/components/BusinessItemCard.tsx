import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Plane, Tag, User, Ticket, XCircle, FileDown, Ban } from 'lucide-react-native';
import { BusinessItem } from '../api/business';

export function BusinessItemCard({ item }: { item: BusinessItem }) {
  const router = useRouter();
  
  const getStatusColor = () => {
    switch (item.status) {
      case 'sold': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'purchased': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      className="bg-card border border-border/50 rounded-2xl mb-4 overflow-hidden"
    >
      <View className="flex-row items-center justify-between p-4 border-b border-border/30">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-slate-800/80 items-center justify-center mr-3">
            {item.status === 'cancelled' ? (
              <XCircle size={20} color="#ef4444" />
            ) : (
              <Plane size={20} color="#3b82f6" />
            )}
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {item.description}
            </Text>
            {item.buyer?.name ? (
              <View className="flex-row items-center mt-0.5">
                <User size={12} color="#94a3b8" />
                <Text className="text-muted text-xs ml-1" numberOfLines={1}>{item.buyer.name}</Text>
              </View>
            ) : item.metadata?.passengers?.[0]?.first_name ? (
              <View className="flex-row items-center mt-0.5">
                <User size={12} color="#94a3b8" />
                <Text className="text-muted text-xs ml-1" numberOfLines={1}>{item.metadata.passengers[0].first_name}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className={`px-2.5 py-1 rounded-full border ${getStatusColor()}`}>
          <Text className="text-xs font-bold capitalize" style={{ color: 'inherit' }}>
            {item.status}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 bg-slate-800/20">
        <View className="flex-row justify-between mb-2">
          <View className="flex-row items-center">
            <Tag size={14} color="#94a3b8" />
            <Text className="text-slate-400 text-xs ml-1.5 font-mono">
              PNR: {item.metadata?.flight?.pnr || 'N/A'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ticket size={14} color="#94a3b8" />
            <Text className="text-slate-400 text-xs ml-1.5 font-mono">
              TKT: {item.metadata?.flight?.ticket_number || 'N/A'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between pt-2 border-t border-slate-700/50 mt-1">
          <View>
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Purchase</Text>
            <Text className="text-white font-medium">{formatCurrency(parseFloat(item.purchase_cost))}</Text>
            <Text className="text-slate-500 text-[10px]">{formatDate(item.created_at)}</Text>
          </View>
          
          <View className="items-center">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Sale</Text>
            <Text className="text-white font-medium">
              {item.sale_amount ? formatCurrency(parseFloat(item.sale_amount)) : '-'}
            </Text>
            <Text className="text-slate-500 text-[10px]">
              {item.status === 'sold' ? formatDate(item.updated_at) : ''}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Profit</Text>
            <Text className={`font-bold ${item.profit && parseFloat(item.profit) > 0 ? 'text-emerald-500' : item.profit && parseFloat(item.profit) < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {item.profit ? formatCurrency(parseFloat(item.profit)) : '-'}
            </Text>
          </View>
        </View>

        {(item.status === 'purchased' || item.status === 'sold') && (
          <View className="mt-3 pt-3 border-t border-slate-700/30 flex-row gap-2">
            <TouchableOpacity 
              className="flex-1 bg-red-500/10 py-2.5 rounded-lg items-center justify-center border border-red-500/30 flex-row"
              activeOpacity={0.7}
              onPress={() => router.push(`/business/cancel?id=${item.id}`)}
            >
              <Ban size={14} color="#ef4444" className="mr-1.5" />
              <Text className="text-red-400 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
            
            {item.status === 'purchased' && (
              <TouchableOpacity 
                className="flex-1 bg-primary-500/20 py-2.5 rounded-lg items-center justify-center border border-primary-500/30"
                activeOpacity={0.7}
                onPress={() => router.push(`/business/sell?id=${item.id}`)}
              >
                <Text className="text-primary-400 font-bold text-sm">Record Sale</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(item.status === 'sold' || item.status === 'cancelled') && (
          <View className="mt-3 pt-3 border-t border-slate-700/30">
            <TouchableOpacity 
              className="bg-slate-700/50 py-2.5 rounded-lg items-center justify-center border border-slate-600 flex-row"
              activeOpacity={0.7}
              onPress={() => router.push(`/business/document?id=${item.id}`)}
            >
              <FileDown size={14} color="#cbd5e1" className="mr-2" />
              <Text className="text-slate-300 font-bold text-sm">Download Ticket (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
