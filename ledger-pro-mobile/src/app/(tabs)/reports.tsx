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
    colors: ['#5AA9F5', '#3A86D9'] as [string, string],
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    icon: TrendingUp,
    route: '/reports/profit-loss',
    description: 'Income, expenses, and net profit',
    colors: ['#3DD68C', '#2BB877'] as [string, string],
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    icon: Layers,
    route: '/reports/balance-sheet',
    description: 'Assets, liabilities, and equity',
    colors: ['#A79BFF', '#8A7CF0'] as [string, string],
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    icon: TrendingDown,
    route: '/reports/cash-flow',
    description: 'Inflow and outflow of cash',
    colors: ['#4FC3E8', '#2FA8CF'] as [string, string],
  },
  {
    id: 'receivables',
    title: 'Receivables',
    icon: FileText,
    route: '/reports/receivables',
    description: 'Money owed to the business',
    colors: ['#3DD68C', '#2BB877'] as [string, string],
  },
  {
    id: 'payables',
    title: 'Payables',
    icon: FileText,
    route: '/reports/payables',
    description: 'Money the business owes',
    colors: ['#FF6B81', '#E85A70'] as [string, string],
  },
  {
    id: 'expense-summary',
    title: 'Expense Summary',
    icon: Receipt,
    route: '/reports/expense-summary',
    description: 'Category-wise expense breakdown',
    colors: ['#F2C14E', '#D9A93A'] as [string, string],
  },
  {
    id: 'income-summary',
    title: 'Income Summary',
    icon: TrendingUp,
    route: '/reports/income-summary',
    description: 'Income source analysis',
    colors: ['#3DD68C', '#2BB877'] as [string, string],
  },
  {
    id: 'credit-cards',
    title: 'Credit Cards',
    icon: CreditCard,
    route: '/reports/credit-cards',
    description: 'Outstanding balances & pay bills',
    colors: ['#F072B6', '#D4559A'] as [string, string],
  },
  {
    id: 'general-ledger',
    title: 'General Ledger',
    icon: BookOpen,
    route: '/transactions',
    description: 'Detailed transaction history',
    colors: ['#7C948C', '#5F776F'] as [string, string],
  },
];

export default function ReportsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#070E0C' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#0A1311', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#0F1B18' }}>
        <Text style={{ color: '#E7F0EB', fontSize: 30, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.4 }}>Financial Reports</Text>
        <Text style={{ color: '#7C948C', fontSize: 13, marginTop: 4 }}>View your business performance</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: '#9FB4AC', fontSize: 10.5, fontFamily: 'DMMono_500Medium', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 }}>
          Available Reports
        </Text>

        <View style={{ backgroundColor: '#0F1B18', borderRadius: 20, borderWidth: 1, borderColor: '#1F3129', overflow: 'hidden' }}>
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
                  borderBottomColor: '#0A1311',
                }}
              >
                <LinearGradient
                  colors={report.colors}
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
                >
                  <Icon size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#E7F0EB', fontWeight: '700', fontSize: 15 }}>{report.title}</Text>
                  <Text style={{ color: '#7C948C', fontSize: 12, marginTop: 2 }}>{report.description}</Text>
                </View>
                <ChevronRight size={18} color="#1F3129" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
