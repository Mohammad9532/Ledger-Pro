import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight, ChevronRight, CreditCard, Scale } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatCurrency } from '../../../utils/format';
import { DashboardSummary } from '../types/dashboard';
import { colors, fonts, radius, text } from '../../../theme';
import { LedgerRules } from '../../../components/LedgerRules';

interface Props {
  summary: DashboardSummary;
}

function Tile({ label, value, icon: Icon, tint, color }: { label: string; value: string; icon: any; tint: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={text.eyebrow} numberOfLines={1}>{label}</Text>
      <Text style={[text.figure, { fontSize: 20, lineHeight: 24, marginTop: 6 }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(value || '0')}
      </Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: color, opacity: 0.85 }} />
    </View>
  );
}

export const SummaryCards = memo(function SummaryCards({ summary }: Props) {
  const router = useRouter();
  const surplus = parseFloat(summary.surplus || '0');
  const assets = parseFloat(summary.asset || '0');

  return (
    <View className="mb-6">
      {/* Hero: the ledger sheet */}
      <TouchableOpacity
        activeOpacity={0.92}
        accessibilityLabel="Net surplus"
        onPress={() => router.push('/accounts' as any)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          padding: 22,
          marginBottom: 14,
          overflow: 'hidden',
        }}
      >
        <LedgerRules count={9} offset={-2} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary }} />

        <View className="flex-row justify-between items-center">
          <Text style={text.eyebrow}>Net surplus</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.primary }}>Accounts</Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </View>

        <Text
          style={[text.figure, { fontSize: 34, lineHeight: 40, marginTop: 10, color: surplus >= 0 ? colors.ink : colors.negative }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(surplus)}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 16 }}>
          <View>
            <Text style={text.eyebrow}>Total assets</Text>
            <Text style={[text.figure, { fontSize: 18, lineHeight: 22, marginTop: 4 }]}>{formatCurrency(assets)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={text.eyebrow}>Business</Text>
            <Text style={[text.figure, { fontSize: 18, lineHeight: 22, marginTop: 4 }]}>{formatCurrency(summary.business || '0')}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View className="flex-row gap-3 mb-3">
        <Tile label="Cash" value={summary.cash} icon={Wallet} tint={colors.positiveSoft} color={colors.positive} />
        <Tile label="Bank" value={summary.bank} icon={Landmark} tint={colors.infoSoft} color={colors.info} />
      </View>

      <View className="flex-row gap-3 mb-3">
        <Tile label="To receive" value={summary.receivable} icon={ArrowDownLeft} tint={colors.violetSoft} color={colors.violet} />
        <Tile label="To pay" value={summary.payable} icon={ArrowUpRight} tint={colors.negativeSoft} color={colors.negative} />
      </View>

      <View className="flex-row gap-3">
        <Tile label="Credit cards" value={summary.credit_card} icon={CreditCard} tint={'rgba(255, 154, 92, 0.14)'} color={colors.orange} />
        <Tile label="Liabilities" value={summary.liability} icon={Scale} tint={colors.warningSoft} color={colors.warning} />
      </View>
    </View>
  );
});
