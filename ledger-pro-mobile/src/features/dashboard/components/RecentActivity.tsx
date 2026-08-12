import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ShoppingCart, Tag, Edit2, Share, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatCurrency, formatRelativeTime } from '../../../utils/format';
import { RecentTransaction } from '../types/dashboard';

interface Props {
  transactions: RecentTransaction[];
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'income':
    case 'receive_money':
      return <ArrowDownLeft size={24} color="#10b981" />;
    case 'expense':
    case 'give_money':
      return <ArrowUpRight size={24} color="#ef4444" />;
    case 'transfer':
      return <RefreshCw size={24} color="#3b82f6" />;
    case 'purchase':
      return <ShoppingCart size={24} color="#f59e0b" />;
    default:
      return <Tag size={24} color="#94a3b8" />;
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'income':
    case 'receive_money':
      return 'bg-success/10';
    case 'expense':
    case 'give_money':
      return 'bg-danger/10';
    case 'transfer':
      return 'bg-blue-500/10';
    case 'purchase':
      return 'bg-amber-500/10';
    default:
      return 'bg-slate-500/10';
  }
};

const renderRightActions = (tx: RecentTransaction) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Deleted', tx.id) }
      ]
    );
  };

  return (
    <View className="flex-row items-center">
      <TouchableOpacity className="w-16 h-full bg-blue-500/20 items-center justify-center" onPress={() => {}}>
        <Edit2 size={20} color="#3b82f6" />
      </TouchableOpacity>
      <TouchableOpacity className="w-16 h-full bg-success/20 items-center justify-center" onPress={() => {}}>
        <Share size={20} color="#10b981" />
      </TouchableOpacity>
      <TouchableOpacity className="w-16 h-full bg-danger/20 items-center justify-center" onPress={handleDelete}>
        <Trash2 size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
};

export const RecentActivity = memo(function RecentActivity({ transactions }: Props) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <View className="mb-8">
      <Text className="text-lg font-bold text-white mb-3">Recent Activity</Text>
      <View className="bg-card rounded-2xl border border-border overflow-hidden">
        {transactions.map((tx, index) => {
          const isLast = index === transactions.length - 1;
          const isIncome = ['income', 'receive_money'].includes(tx.type);
          const isExpense = ['expense', 'give_money'].includes(tx.type);
          
          return (
            <Swipeable 
              key={tx.id} 
              renderRightActions={() => renderRightActions(tx)}
              friction={2} // forgiving threshold
              rightThreshold={40}
            >
              <TouchableOpacity 
                activeOpacity={0.7}
                className={`p-4 flex-row items-center justify-between bg-card ${!isLast ? 'border-b border-border' : ''}`}
              >
                <View className="flex-row items-center flex-1">
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${getTransactionColor(tx.type)}`}>
                    {getTransactionIcon(tx.type)}
                  </View>
                  <View className="flex-1 pr-4">
                    <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1).replace('_', ' ')}
                    </Text>
                    <Text className="text-muted text-sm" numberOfLines={1}>
                      {tx.entries[0]?.account?.name || tx.description || 'Account'}
                    </Text>
                  </View>
                </View>
                
                <View className="items-end">
                  <Text className={`font-bold text-base mb-1 ${isIncome ? 'text-success/90' : isExpense ? 'text-danger/90' : 'text-white'}`}>
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {formatCurrency(tx.amount)}
                  </Text>
                  <Text className="text-muted text-xs">{formatRelativeTime(tx.date)}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
      </View>
    </View>
  );
});
