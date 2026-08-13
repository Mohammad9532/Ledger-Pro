import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatCurrency, formatDate } from '../../../utils/format';
import { ArrowRightLeft, CreditCard, Wallet, FileText, XCircle } from 'lucide-react-native';

interface TransactionEntry {
  account_id: number;
  account_name: string;
  debit: string;
  credit: string;
  account?: { name: string };
}

interface TransactionItemProps {
  transaction: {
    id: number;
    reference: string;
    date: string;
    type: string;
    description: string;
    amount: string;
    entries: TransactionEntry[];
  };
  onPress?: () => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const getIcon = () => {
    switch (transaction.type) {
      case 'income':
      case 'sale':
        return <Wallet size={20} color="#10b981" />;
      case 'expense':
      case 'purchase':
        return <CreditCard size={20} color="#ef4444" />;
      case 'transfer':
      case 'journal':
        return <ArrowRightLeft size={20} color="#f59e0b" />;
      case 'cancellation':
        return <XCircle size={20} color="#64748b" />;
      default:
        return <FileText size={20} color="#3b82f6" />;
    }
  };

  const getTypeColor = () => {
    switch (transaction.type) {
      case 'income':
      case 'sale':
        return 'text-success';
      case 'expense':
      case 'purchase':
        return 'text-danger';
      case 'transfer':
      case 'journal':
        return 'text-warning';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className="bg-card border border-border/50 rounded-2xl mb-4 overflow-hidden"
    >
      <View className="flex-row items-center justify-between p-4 border-b border-border/30">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-slate-800/80 items-center justify-center mr-3">
            {getIcon()}
          </View>
          <View>
            <Text className="text-white font-bold text-base capitalize">{transaction.type.replace('_', ' ')}</Text>
            <Text className="text-muted text-xs mt-0.5">{formatDate(transaction.date)}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-black text-lg ${getTypeColor()}`}>
            {formatCurrency(parseFloat(transaction.amount))}
          </Text>
          <Text className="text-muted text-xs font-mono">{transaction.reference}</Text>
        </View>
      </View>

      <View className="px-4 py-3 bg-slate-800/20">
        {transaction.description ? (
          <Text className="text-slate-300 text-sm mb-3 italic">"{transaction.description}"</Text>
        ) : null}

        {transaction.entries.map((entry, index) => {
          const debit = parseFloat(entry.debit);
          const credit = parseFloat(entry.credit);
          return (
            <View key={index} className="flex-row justify-between items-center mb-1.5">
              <Text className="text-slate-400 text-xs flex-1">{entry.account?.name || entry.account_name}</Text>
              {debit > 0 ? (
                <Text className="text-blue-400 text-xs font-bold">Dr {formatCurrency(debit)}</Text>
              ) : (
                <Text className="text-orange-400 text-xs font-bold">Cr {formatCurrency(credit)}</Text>
              )}
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}
