import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ShoppingCart, Tag, Edit2, Trash2, CreditCard, XCircle } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatCurrency, formatRelativeTime } from '../../../utils/format';
import { RecentTransaction } from '../types/dashboard';
import { colors, fonts, radius, text } from '../../../theme';

interface Props {
  transactions: RecentTransaction[];
}

const TX_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  income:        { icon: ArrowDownLeft, color: colors.positive, bg: colors.positiveSoft, label: 'Income' },
  receive_money: { icon: ArrowDownLeft, color: colors.positive, bg: colors.positiveSoft, label: 'Received' },
  sale:          { icon: Tag,           color: colors.positive, bg: colors.positiveSoft, label: 'Sale' },
  expense:       { icon: ArrowUpRight,  color: colors.negative, bg: colors.negativeSoft, label: 'Expense' },
  give_money:    { icon: ArrowUpRight,  color: colors.negative, bg: colors.negativeSoft, label: 'Given' },
  purchase:      { icon: ShoppingCart,  color: colors.warning,  bg: colors.warningSoft,  label: 'Purchase' },
  cancellation:  { icon: XCircle,       color: colors.negative, bg: colors.negativeSoft, label: 'Cancellation' },
  transfer:      { icon: RefreshCw,     color: colors.info,     bg: colors.infoSoft,     label: 'Transfer' },
  cc_payment:    { icon: CreditCard,    color: colors.violet,   bg: colors.violetSoft,   label: 'CC Payment' },
};

const getConfig = (type: string) =>
  TX_CONFIG[type] ?? { icon: Tag, color: colors.inkMuted, bg: 'rgba(159, 180, 172, 0.12)', label: type.replace(/_/g, ' ') };

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
      <TouchableOpacity style={{ width: 60, flex: 1, backgroundColor: colors.infoSoft, alignItems: 'center', justifyContent: 'center' }} onPress={() => {}}>
        <Edit2 size={20} color={colors.info} />
      </TouchableOpacity>
      <TouchableOpacity style={{ width: 60, flex: 1, backgroundColor: colors.negativeSoft, alignItems: 'center', justifyContent: 'center' }} onPress={handleDelete}>
        <Trash2 size={20} color={colors.negative} />
      </TouchableOpacity>
    </View>
  );
};

export const RecentActivity = memo(function RecentActivity({ transactions }: Props) {
  const router = useRouter();
  if (!transactions || transactions.length === 0) return null;

  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <Text style={text.sectionTitle}>Recent entries</Text>
        <TouchableOpacity onPress={() => router.push('/transactions' as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.primary }}>See all →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {transactions.map((tx, index) => {
          const isLast = index === transactions.length - 1;
          const cfg = getConfig(tx.type);
          const isIncome = ['income', 'receive_money', 'sale'].includes(tx.type);
          const isExpense = ['expense', 'give_money', 'purchase', 'cancellation'].includes(tx.type);
          const Icon = cfg.icon;
          const amountColor = isIncome ? colors.positive : isExpense ? colors.negative : colors.ink;

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
                  backgroundColor: colors.surface,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.bg,
                }}
              >
                {/* Left accent bar */}
                <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: cfg.color, borderRadius: 2, marginRight: 12 }} />

                {/* Icon */}
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon size={18} color={cfg.color} strokeWidth={2} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansSemiBold, color: colors.ink, fontSize: 14 }}>
                    {cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, color: colors.inkFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {tx.entries[0]?.account?.name || tx.description || '—'}
                  </Text>
                </View>

                {/* Amount + Time */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: fonts.monoMedium, fontSize: 14, color: amountColor, fontVariant: ['tabular-nums'] }}>
                    {isIncome ? '+' : isExpense ? '−' : ''}{formatCurrency(tx.amount)}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, color: colors.inkGhost, fontSize: 10.5, marginTop: 3 }}>{formatRelativeTime(tx.date)}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
      </View>
    </View>
  );
});
