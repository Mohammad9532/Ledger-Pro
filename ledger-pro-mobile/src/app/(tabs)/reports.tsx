import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BarChart2, TrendingUp, TrendingDown, BookOpen, Layers, FileText, ChevronRight, Receipt, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const REPORT_ITEMS = [
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    icon: BarChart2,
    route: '/reports/trial-balance',
    description: 'Verify total debits and credits',
    colors: ['#3b82f6', '#1d4ed8'] as [string, string],
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    icon: TrendingUp,
    route: '/reports/profit-loss',
    description: 'Income, expenses, and net profit',
    colors: ['#10b981', '#059669'] as [string, string],
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    icon: Layers,
    route: '/reports/balance-sheet',
    description: 'Assets, liabilities, and equity',
    colors: ['#8b5cf6', '#6d28d9'] as [string, string],
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    icon: TrendingDown,
    route: '/reports/cash-flow',
    description: 'Inflow and outflow of cash',
    colors: ['#06b6d4', '#0891b2'] as [string, string],
  },
  {
    id: 'receivables',
    title: 'Receivables',
    icon: FileText,
    route: '/reports/receivables',
    description: 'Money owed to the business',
    colors: ['#10b981', '#059669'] as [string, string],
  },
  {
    id: 'payables',
    title: 'Payables',
    icon: FileText,
    route: '/reports/payables',
    description: 'Money the business owes',
    colors: ['#ef4444', '#dc2626'] as [string, string],
  },
  {
    id: 'expense-summary',
    title: 'Expense Summary',
    icon: Receipt,
    route: '/reports/expense-summary',
    description: 'Category-wise expense breakdown',
    colors: ['#f59e0b', '#d97706'] as [string, string],
  },
  {
    id: 'income-summary',
    title: 'Income Summary',
    icon: TrendingUp,
    route: '/reports/income-summary',
    description: 'Income source analysis',
    colors: ['#10b981', '#059669'] as [string, string],
  },
  {
    id: 'credit-cards',
    title: 'Credit Cards',
    icon: CreditCard,
    route: '/reports/credit-cards',
    description: 'Outstanding balances & pay bills',
    colors: ['#ec4899', '#be185d'] as [string, string],
  },
  {
    id: 'general-ledger',
    title: 'General Ledger',
    icon: BookOpen,
    route: '/transactions',
    description: 'Detailed transaction history',
    colors: ['#64748b', '#475569'] as [string, string],
  },
];

export default function ReportsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#0f172a', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
        <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800' }}>Financial Reports</Text>
        <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>View your business performance</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 }}>
          Available Reports
        </Text>

        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
          {REPORT_ITEMS.map((report, index, arr) => {
            const Icon = report.icon;
            const isLast = index === arr.length - 1;
            return (
              <TouchableOpacity
                key={report.id}
                onPress={() => router.push(report.route as any)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: '#0f172a',
                }}
              >
                <LinearGradient
                  colors={report.colors}
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
                >
                  <Icon size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 15 }}>{report.title}</Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{report.description}</Text>
                </View>
                <ChevronRight size={18} color="#334155" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
