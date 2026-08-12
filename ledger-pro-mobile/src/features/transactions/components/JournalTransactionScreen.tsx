import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, FileText, Plus, Trash2, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { AccountSelectorSheet } from './AccountSelectorSheet';
import { useCreateTransaction, TransactionPayload } from '../api/transactions';
import { Account } from '../../accounts/api/accounts';
import { formatCurrency } from '../../../utils/format';

interface JournalRow {
  id: string;
  account: Account | null;
  debit: string;
  credit: string;
}

export function JournalTransactionScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [rows, setRows] = useState<JournalRow[]>([
    { id: '1', account: null, debit: '', credit: '' },
    { id: '2', account: null, debit: '', credit: '' }
  ]);
  
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const accountSheetRef = useRef<BottomSheetModal>(null);

  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const totalDebit = rows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && difference === 0;

  const handleAddRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRows([...rows, { id: Date.now().toString(), account: null, debit: '', credit: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRows(rows.filter(r => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof JournalRow, value: any) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const newRow = { ...r, [field]: value };
      // If debit is typed, clear credit, and vice versa
      if (field === 'debit' && value !== '') newRow.credit = '';
      if (field === 'credit' && value !== '') newRow.debit = '';
      return newRow;
    }));
  };

  React.useEffect(() => {
    const loadDraft = async () => {
      const draft = await AsyncStorage.getItem('draft_journal');
      if (draft) {
        Alert.alert('Draft Found', 'Would you like to resume your unsaved draft?', [
          { text: 'Discard', style: 'destructive', onPress: () => AsyncStorage.removeItem('draft_journal') },
          { text: 'Resume', onPress: () => {
              const data = JSON.parse(draft);
              if (data.rows) setRows(data.rows);
              if (data.description) setDescription(data.description);
            }
          }
        ]);
      }
    };
    loadDraft();
  }, []);

  React.useEffect(() => {
    const hasData = description || rows.some(r => r.account || r.debit || r.credit);
    if (hasData) {
       AsyncStorage.setItem('draft_journal', JSON.stringify({rows, description}));
    }
  }, [rows, description]);

  const handleBack = () => {
    const hasData = description || rows.some(r => r.account || r.debit || r.credit);
    if (hasData) {
      Alert.alert('Discard changes?', 'You have unsaved changes. Are you sure you want to discard them?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() }
      ]);
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!isBalanced) {
      Alert.alert('Validation Error', 'Journal entry must be balanced (Total Debits = Total Credits).');
      return;
    }
    
    const validRows = rows.filter(r => r.account && (parseFloat(r.debit) > 0 || parseFloat(r.credit) > 0));
    if (validRows.length < 2) {
      Alert.alert('Validation Error', 'Journal entry requires at least two valid entries.');
      return;
    }

    const entries = validRows.map(r => ({
      account_id: r.account!.id,
      debit: parseFloat(r.debit) || 0,
      credit: parseFloat(r.credit) || 0,
    }));

    const payload: TransactionPayload = {
      type: 'journal',
      amount: totalDebit, // amount is just the total
      date: format(date, 'yyyy-MM-dd'),
      description,
      entries
    };

    createTransaction(payload, {
      onSuccess: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.removeItem('draft_journal');
        Toast.show({
          type: 'success',
          text1: '✓ Journal Saved',
          visibilityTime: 1500,
        });
        router.back();
      },
      onError: (error: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save transaction';
        const validationErrors = error.response?.data?.errors;
        let details = '';
        if (validationErrors) {
          details = '\n' + Object.values(validationErrors).flat().join('\n');
        }
        Alert.alert('Error', errorMessage + details);
      }
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-border bg-card">
        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">New Journal Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Status Card */}
        <View className={`m-4 p-4 rounded-xl border ${isBalanced ? 'bg-success/10 border-success/30' : 'bg-card border-border'}`}>
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted text-xs">Total Debits</Text>
            <Text className="text-muted text-xs">Total Credits</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white font-bold text-lg">{formatCurrency(totalDebit)}</Text>
            <Text className="text-white font-bold text-lg">{formatCurrency(totalCredit)}</Text>
          </View>
          <View className="flex-row items-center justify-center pt-2 border-t border-border/50">
            {isBalanced ? (
              <>
                <CheckCircle2 size={16} color="#10b981" className="mr-2" />
                <Text className="text-success font-bold">Balanced</Text>
              </>
            ) : (
              <Text className="text-danger font-medium">Difference: {formatCurrency(difference)}</Text>
            )}
          </View>
        </View>

        {/* Rows */}
        <View className="px-4 pb-4">
          {rows.map((row, index) => (
            <View key={row.id} className="bg-card rounded-xl p-4 mb-4 border border-border">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-xs">Entry {index + 1}</Text>
                {rows.length > 2 && (
                  <TouchableOpacity onPress={() => handleRemoveRow(row.id)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              <TouchableOpacity 
                className="bg-slate-800 rounded-lg p-3 mb-3 border border-slate-700"
                onPress={() => {
                  setActiveRowId(row.id);
                  accountSheetRef.current?.present();
                }}
              >
                <Text className={row.account ? 'text-white' : 'text-slate-500'}>
                  {row.account ? row.account.name : 'Select Account'}
                </Text>
              </TouchableOpacity>
              
              <View className="flex-row gap-3">
                <View className="flex-1 bg-slate-800 rounded-lg p-3 border border-slate-700 flex-row items-center">
                  <Text className="text-muted mr-2">Dr.</Text>
                  <TextInput
                    value={row.debit}
                    onChangeText={(val) => handleUpdateRow(row.id, 'debit', val.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    className="flex-1 text-white"
                  />
                </View>
                <View className="flex-1 bg-slate-800 rounded-lg p-3 border border-slate-700 flex-row items-center">
                  <Text className="text-muted mr-2">Cr.</Text>
                  <TextInput
                    value={row.credit}
                    onChangeText={(val) => handleUpdateRow(row.id, 'credit', val.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    className="flex-1 text-white"
                  />
                </View>
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            className="flex-row items-center justify-center p-3 border border-dashed border-primary-500/50 rounded-xl bg-primary-500/10 mb-6"
            onPress={handleAddRow}
          >
            <Plus size={20} color="#f97316" className="mr-2" />
            <Text className="text-primary-500 font-bold">Add Entry Line</Text>
          </TouchableOpacity>

          {/* Date & Description */}
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30"
            onPress={() => setShowDatePicker(true)}
          >
            <View>
              <Text className="text-muted text-sm font-medium mb-1">Date</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color="#94a3b8" className="mr-2" />
                <Text className="text-white text-base">{format(date, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View className="py-4 border-b border-border">
            <Text className="text-muted text-sm font-medium mb-2">Description</Text>
            <View className="flex-row items-center">
              <FileText size={16} color="#94a3b8" className="mr-2" />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Journal Reference"
                placeholderTextColor="#64748b"
                className="flex-1 text-white text-base"
              />
            </View>
          </View>

          {/* Receipt Placeholder */}
          <View className="py-4">
            <Text className="text-muted text-sm font-medium mb-2">Attachments</Text>
            <TouchableOpacity 
              className="flex-row items-center justify-center p-4 border border-dashed border-slate-700 rounded-xl bg-slate-800/50"
              activeOpacity={1}
            >
              <Text className="text-slate-500 text-sm font-medium">📎 Receipt (Coming Soon)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View className="p-4 border-t border-border bg-card">
        <TouchableOpacity
          className={`h-14 rounded-xl items-center justify-center ${isPending || !isBalanced ? 'bg-primary-500/50' : 'bg-primary-500'}`}
          onPress={handleSave}
          disabled={isPending || !isBalanced}
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-bold">
            {isPending ? 'Saving...' : 'Save Journal'}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <AccountSelectorSheet 
        ref={accountSheetRef}
        onSelect={(acc) => {
          if (activeRowId) handleUpdateRow(activeRowId, 'account', acc);
        }}
      />
    </KeyboardAvoidingView>
  );
}
