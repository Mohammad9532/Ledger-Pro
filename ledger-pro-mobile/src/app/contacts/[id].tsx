import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useContactSummary, useContactLedger } from '../../features/accounts/api/contacts';
import { StatementEntry } from '../../features/accounts/api/accounts';
import { formatCurrency, formatDate } from '../../utils/format';
import { Alert } from 'react-native';
import api from '../../api/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ContactProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contactId = Number(id);

  const [activeTab, setActiveTab] = useState<'summary' | 'ledger'>('summary');
  const [showDetails, setShowDetails] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!summaryData?.contact?.account_id) return;
    setIsExporting(true);
    try {
      const response = await api.get('/reports/account-ledger/export', {
        params: {
          format: 'pdf',
          account_id: summaryData.contact.account_id
        },
        responseType: 'arraybuffer'
      });
      
      const uint8Array = new Uint8Array(response.data);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = typeof btoa === 'function' ? btoa(binary) : null;
      if (!base64) throw new Error('Base64 encoding not available');

      const fileUri = FileSystem.documentDirectory + `Ledger_${summaryData.contact.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Success', 'PDF generated but sharing is not available.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to export PDF: ' + (e.message || String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  const { data: summaryData, isLoading: isLoadingSummary } = useContactSummary(contactId);
  const { 
    data: ledgerData, 
    isLoading: isLoadingLedger,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useContactLedger(contactId);

  const ledgerEntries = useMemo(() => {
    if (!ledgerData) return [];
    return ledgerData.pages.flatMap((page) => page.statement.statement.data);
  }, [ledgerData]);

  if (isLoadingSummary) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!summaryData) return null;

  const { contact } = summaryData;
  const balance = parseFloat(summaryData.outstanding);
  const balanceText = balance > 0 
    ? `Owes you ${formatCurrency(balance)}` 
    : balance < 0 
      ? `You owe ${formatCurrency(Math.abs(balance))}` 
      : 'Settled';
  const balanceColor = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-white';

  const handleArchiveToggle = async () => {
    Alert.alert(
      contact.is_archived ? 'Restore Contact' : 'Archive Contact',
      `Are you sure you want to ${contact.is_archived ? 'restore' : 'archive'} this contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: contact.is_archived ? 'Restore' : 'Archive', 
          style: contact.is_archived ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (contact.is_archived) {
                await api.post(`/contacts/${contact.id}/restore`);
              } else {
                await api.post(`/contacts/${contact.id}/archive`);
              }
              // router.replace would be ideal, or just let it refresh if we invalidate queries
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.response?.data?.error || 'Failed to update contact');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View className="bg-card px-4 pt-14 pb-4 border-b border-border">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/people')} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Contact Profile</Text>
        <TouchableOpacity className="p-2" onPress={handleArchiveToggle}>
          <Text className={contact.is_archived ? "text-success font-bold" : "text-danger font-bold"}>
            {contact.is_archived ? 'Restore' : 'Archive'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="items-center mb-6 mt-4">
        <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-4 border border-slate-700">
          <Text className="text-white text-3xl font-bold">{contact.name.charAt(0)}</Text>
        </View>
        <Text className="text-white text-2xl font-bold mb-1">{contact.name}</Text>
        <Text className={`${balanceColor} font-bold text-lg`}>{balanceText}</Text>
        
        <View className="flex-row items-center justify-center gap-2 mt-4 flex-wrap">
          <TouchableOpacity 
            className="flex-row items-center bg-primary-500/20 px-4 py-2 rounded-full border border-primary-500/30"
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? <ActivityIndicator size="small" color="#f97316" /> : <FileText size={16} color="#f97316" />}
            <Text className="text-primary-500 font-bold text-sm ml-2">Export</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700"
            onPress={() => router.push(`/contacts/edit/${id}`)}
          >
            <Text className="text-white font-bold text-sm">Edit</Text>
          </TouchableOpacity>

          {balance !== 0 && !contact.is_archived && (
            <TouchableOpacity 
              className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700"
              onPress={() => Alert.alert('Adjust Balance', 'Please use the web application to adjust balances with specific accounting categories.')}
            >
              <Text className="text-slate-300 font-bold text-sm">Adjust Balance</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity 
        className="flex-row items-center justify-center py-2"
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text className="text-muted mr-1">{showDetails ? 'Hide Details' : 'Show Details'}</Text>
        {showDetails ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
      </TouchableOpacity>

      {showDetails && (
        <View className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
          {contact.phone && (
            <View className="flex-row items-center mb-3">
              <Phone size={16} color="#94a3b8" className="mr-3" />
              <Text className="text-white">{contact.phone}</Text>
            </View>
          )}
          <View className="flex-row items-center mb-3">
            <Mail size={16} color="#94a3b8" className="mr-3" />
            <Text className="text-white">Email not provided</Text>
          </View>
          {contact.notes && (
            <View className="flex-row items-center">
              <FileText size={16} color="#94a3b8" className="mr-3" />
              <Text className="text-white">{contact.notes}</Text>
            </View>
          )}
        </View>
      )}

      {/* Segmented Control */}
      <View className="flex-row bg-slate-800 p-1 rounded-xl mt-6">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'summary' ? 'bg-primary-500' : ''}`}
          onPress={() => setActiveTab('summary')}
        >
          <Text className={`font-bold ${activeTab === 'summary' ? 'text-white' : 'text-slate-400'}`}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'ledger' ? 'bg-primary-500' : ''}`}
          onPress={() => setActiveTab('ledger')}
        >
          <Text className={`font-bold ${activeTab === 'ledger' ? 'text-white' : 'text-slate-400'}`}>
            Ledger
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummary = () => (
    <ScrollView className="flex-1 px-4 pt-6">
      <View className="flex-row flex-wrap justify-between">
        <View className="w-[48%] bg-card p-4 rounded-xl border border-border mb-4">
          <Text className="text-muted text-xs mb-1">Total Sales</Text>
          <Text className="text-white font-bold text-lg">{formatCurrency(summaryData.total_sales)}</Text>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-border mb-4">
          <Text className="text-muted text-xs mb-1">Amount Received</Text>
          <Text className="text-white font-bold text-lg">{formatCurrency(summaryData.amount_received)}</Text>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-border mb-4">
          <Text className="text-muted text-xs mb-1">Total Given</Text>
          <Text className="text-white font-bold text-lg">{formatCurrency(summaryData.total_given)}</Text>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-border mb-4">
          <Text className="text-muted text-xs mb-1">Profit Generated</Text>
          <Text className="text-success font-bold text-lg">{formatCurrency(summaryData.profit_generated)}</Text>
        </View>
      </View>
      
      {summaryData.recent_transactions.length > 0 && (
        <View className="mt-4 pb-12">
          <Text className="text-white font-bold text-lg mb-4">Recent Activity</Text>
          {summaryData.recent_transactions.map((txn, index) => (
            <View key={index} className="bg-card p-4 rounded-xl border border-border mb-3 flex-row justify-between items-center">
              <View>
                <Text className="text-white font-medium">{txn.description}</Text>
                <Text className="text-muted text-xs mt-1">{formatDate(txn.date)}</Text>
              </View>
              <Text className="text-white font-bold">{formatCurrency(txn.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderLedgerEntry = ({ item }: { item: StatementEntry }) => {
    const isCredit = parseFloat(item.credit) > 0;
    const amount = isCredit ? item.credit : item.debit;
    
    return (
      <View className="bg-card px-4 py-4 border-b border-border">
        <View className="flex-row justify-between mb-1">
          <Text className="text-white font-medium flex-1 mr-2" numberOfLines={1}>
            {item.description}
          </Text>
          <Text className={`font-bold ${isCredit ? 'text-success' : 'text-white'}`}>
            {isCredit ? '+' : '-'}{formatCurrency(parseFloat(amount))}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-xs">{formatDate(item.date)}</Text>
          <Text className="text-muted text-xs">Balance: {formatCurrency(parseFloat(item.balance))}</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {renderHeader()}
      
      {activeTab === 'summary' ? (
        renderSummary()
      ) : (
        <FlatList
          data={ledgerEntries}
          keyExtractor={(item, index) => item?.transaction_id ? item.transaction_id.toString() : index.toString()}
          renderItem={({ item }) => {
            if (!item) return null;
            return renderLedgerEntry({ item });
          }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isLoadingLedger ? (
              <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />
            ) : (
              <View className="p-8 items-center">
                <Text className="text-muted">No ledger entries found.</Text>
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#f97316" />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}
