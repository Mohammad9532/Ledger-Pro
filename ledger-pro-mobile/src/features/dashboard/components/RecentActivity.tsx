import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ShoppingCart, Tag, Edit2, Share, Trash2, CreditCard, XCircle } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatCurrency, formatRelativeTime } from '../../../utils/format';
import { RecentTransaction } from '../types/dashboard';

interface Props {
  transactions: RecentTransaction[];
}

const TX_CONFIG: Record<string, { icon: any; color: string; bg: string; accent: string; label: string }> = {
  income:       { icon: ArrowDownLeft,  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  accent: '#10b981', label: 'Income' },
  receive_money:{ icon: ArrowDownLeft,  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  accent: '#10b981', label: 'Received' },
  sale:         { icon: Tag,            color: '#10b981', bg: 'rgba(16,185,129,0.12)',  accent: '#10b981', label: 'Sale' },
  expense:      { icon: ArrowUpRight,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   accent: '#ef4444', label: 'Expense' },
  give_money:   { icon: ArrowUpRight,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   accent: '#ef4444', label: 'Given' },
  purchase:     { icon: ShoppingCart,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  accent: '#f59e0b', label: 'Purchase' },
  cancellation: { icon: XCircle,        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   accent: '#ef4444', label: 'Cancellation' },
  transfer:     { icon: RefreshCw,      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  accent: '#3b82f6', label: 'Transfer' },
  cc_payment:   { icon: CreditCard,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  accent: '#8b5cf6', label: 'CC Payment' },
};

const getConfig = (type: string) => TX_CONFIG[type] ?? { icon: Tag, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', accent: '#94a3b8', label: type.replace(/_/g, ' ') };

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
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity style={{ width: 60, flex: 1, backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center' }} onPress={() => {}}>
        <Edit2 size={20} color="#3b82f6" />
      </TouchableOpacity>
      <TouchableOpacity style={{ width: 60, flex: 1, backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' }} onPress={handleDelete}>
        <Trash2 size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
};

export const RecentActivity = memo(function RecentActivity({ transactions }: Props) {
  const router = useRouter();
  if (!transactions || transactions.length === 0) return null;

  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#f8fafc' }}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push('/transactions' as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 12, color: '#f97316', fontWeight: '600' }}>See all →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
        {transactions.map((tx, index) => {
          const isLast = index === transactions.length - 1;
          const cfg = getConfig(tx.type);
          const isIncome = ['income', 'receive_money', 'sale'].includes(tx.type);
          const isExpense = ['expense', 'give_money', 'purchase', 'cancellation'].includes(tx.type);
          const Icon = cfg.icon;

          return (
            <Swipeable 
              key={tx.id} 
              renderRightActions={() => renderRightActions(tx)}
              friction={2}
              rightThreshold={40}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  paddingLeft: 0,
                  backgroundColor: '#1e293b',
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: '#0f172a',
                }}
              >
                {/* Left accent bar */}
                <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: cfg.accent, borderRadius: 2, marginRight: 12 }} />

                {/* Icon */}
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon size={20} color={cfg.color} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 14 }}>
                    {cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {tx.entries[0]?.account?.name || tx.description || '—'}
                  </Text>
                </View>

                {/* Amount + Time */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: isIncome ? '#10b981' : isExpense ? '#ef4444' : '#f8fafc' }}>
                    {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(tx.amount)}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 11, marginTop: 3 }}>{formatRelativeTime(tx.date)}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
      </View>
    </View>
  );
});

