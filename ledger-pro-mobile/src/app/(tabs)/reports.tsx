import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'react-native-expo-router'; // Wait, let's just use expo-router
import { router } from 'expo-router';
import { BarChart2, PieChart, TrendingUp, TrendingDown, BookOpen, Layers, Settings, FileText } from 'lucide-react-native';

const REPORT_ITEMS = [
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    icon: BarChart2,
    active: true,
    route: '/reports/trial-balance',
    description: 'Verify total debits and credits.',
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    icon: TrendingUp,
    active: true,
    route: '/reports/profit-loss',
    description: 'Income, expenses, and net profit.',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    icon: Layers,
    active: true,
    route: '/reports/balance-sheet',
    description: 'Assets, liabilities, and equity.',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    icon: TrendingDown,
    active: true,
    route: '/reports/cash-flow',
    description: 'Inflow and outflow of cash.',
  },
  {
    id: 'receivables',
    title: 'Receivables',
    icon: FileText,
    active: true,
    route: '/reports/receivables',
    description: 'Money owed to the business.',
  },
  {
    id: 'payables',
    title: 'Payables',
    icon: FileText,
    active: true,
    route: '/reports/payables',
    description: 'Money the business owes.',
  },
  {
    id: 'general-ledger',
    title: 'General Ledger',
    icon: BookOpen,
    active: false,
    description: 'Detailed transaction history.',
  },
];

export default function ReportsScreen() {
  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border">
        <Text className="text-white text-2xl font-bold">Financial Reports</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Active Reports */}
        <Text className="text-white text-lg font-bold mb-4 mt-2">Available Reports</Text>
        <View className="flex-row flex-wrap justify-between">
          {REPORT_ITEMS.filter(r => r.active).map(report => {
            const Icon = report.icon;
            return (
              <TouchableOpacity
                key={report.id}
                className="bg-card w-[48%] rounded-2xl p-4 mb-4 border border-border"
                onPress={() => router.push(report.route as any)}
              >
                <View className="bg-primary-500/20 w-12 h-12 rounded-xl items-center justify-center mb-3">
                  <Icon size={24} color="#f97316" />
                </View>
                <Text className="text-white font-bold mb-1">{report.title}</Text>
                <Text className="text-muted text-xs">{report.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Coming Soon */}
        <Text className="text-muted text-lg font-bold mb-4 mt-6">Coming Soon</Text>
        <View className="flex-row flex-wrap justify-between">
          {REPORT_ITEMS.filter(r => !r.active).map(report => {
            const Icon = report.icon;
            return (
              <View
                key={report.id}
                className="bg-card/50 w-[48%] rounded-2xl p-4 mb-4 border border-border/50 opacity-60"
              >
                <View className="bg-slate-800 w-12 h-12 rounded-xl items-center justify-center mb-3">
                  <Icon size={24} color="#94a3b8" />
                </View>
                <Text className="text-white font-bold mb-1">{report.title}</Text>
                <Text className="text-muted text-xs">{report.description}</Text>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}
