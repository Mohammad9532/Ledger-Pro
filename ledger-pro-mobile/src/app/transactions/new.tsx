import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, FileText, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { AmountInput } from '../../features/transactions/components/AmountInput';
import { AccountSelectorSheet } from '../../features/transactions/components/AccountSelectorSheet';
import { useCreateTransaction, TransactionPayload } from '../../features/transactions/api/transactions';
import { Account } from '../../features/accounts/api/accounts';
import { JournalTransactionScreen } from '../../features/transactions/components/JournalTransactionScreen';

export default function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const txType = (type || 'expense') as 'expense' | 'income' | 'transfer' | 'journal';

  if (txType === 'journal') {
    return <JournalTransactionScreen />;
  }

  return <StandardTransactionScreen txType={txType} />;
}

function StandardTransactionScreen({ txType }: { txType: 'expense' | 'income' | 'transfer' }) {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Accounts
  const [categoryAccount, setCategoryAccount] = useState<Account | null>(null);
  const [paymentAccount, setPaymentAccount] = useState<Account | null>(null);
  
  // Sheet Refs
  const categorySheetRef = useRef<BottomSheetModal>(null);
  const paymentSheetRef = useRef<BottomSheetModal>(null);

  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const isExpense = txType === 'expense';
  const isIncome = txType === 'income';
  const isTransfer = txType === 'transfer';

  // Computed properties based on type
  const categoryLabel = isExpense ? 'Category' : isIncome ? 'Income Source' : 'To Account';
  const categoryFilter = isExpense ? 'expense' : isIncome ? 'income' : 'bank';
  
  const paymentLabel = isExpense ? 'Paid From' : isIncome ? 'Deposited To' : 'From Account';
  const paymentFilter = isTransfer ? 'bank' : undefined; // Undefined fetches all, but we might want just cash/bank/cc

  // Draft Recovery
  React.useEffect(() => {
    const loadDraft = async () => {
      const draft = await AsyncStorage.getItem(`draft_${txType}`);
      if (draft) {
        Alert.alert('Draft Found', 'Would you like to resume your unsaved draft?', [
          { text: 'Discard', style: 'destructive', onPress: () => AsyncStorage.removeItem(`draft_${txType}`) },
          { text: 'Resume', onPress: () => {
              const data = JSON.parse(draft);
              if (data.amount) setAmount(data.amount);
              if (data.description) setDescription(data.description);
            }
          }
        ]);
      }
    };
    loadDraft();
  }, [txType]);

  // Save Draft
  React.useEffect(() => {
    if (amount || description) {
       AsyncStorage.setItem(`draft_${txType}`, JSON.stringify({amount, description}));
    }
  }, [amount, description, txType]);

  const handleBack = () => {
    if (amount || description || categoryAccount || paymentAccount) {
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
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!categoryAccount) {
      Alert.alert('Validation Error', `Please select a ${categoryLabel.toLowerCase()}.`);
      return;
    }
    if (!paymentAccount) {
      Alert.alert('Validation Error', `Please select a ${paymentLabel.toLowerCase()}.`);
      return;
    }

    // Build entries
    let entries: TransactionPayload['entries'] = [];
    if (isExpense) {
      entries = [
        { account_id: categoryAccount.id, debit: parsedAmount, credit: 0 },
        { account_id: paymentAccount.id, debit: 0, credit: parsedAmount }
      ];
    } else if (isIncome) {
      entries = [
        { account_id: paymentAccount.id, debit: parsedAmount, credit: 0 }, // Receiving account gets debit
        { account_id: categoryAccount.id, debit: 0, credit: parsedAmount } // Income category gets credit
      ];
    } else if (isTransfer) {
      entries = [
        { account_id: categoryAccount.id, debit: parsedAmount, credit: 0 }, // To Account gets debit
        { account_id: paymentAccount.id, debit: 0, credit: parsedAmount } // From Account gets credit
      ];
    }

    const payload: TransactionPayload = {
      type: txType,
      amount: parsedAmount,
      date: format(date, 'yyyy-MM-dd'),
      description,
      entries
    };

    createTransaction(payload, {
      onSuccess: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.removeItem(`draft_${txType}`);
        Toast.show({
          type: 'success',
          text1: '✓ Transaction Saved',
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

  const getHeaderTitle = () => {
    switch (txType) {
      case 'expense': return 'New Expense';
      case 'income': return 'New Income';
      case 'transfer': return 'New Transfer';
      default: return 'New Transaction';
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-border bg-card">
        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">{getHeaderTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <AmountInput value={amount} onChange={setAmount} />

        <View className="px-6 pb-12">
          {/* Category Selector */}
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30"
            onPress={() => categorySheetRef.current?.present()}
          >
            <View>
              <Text className="text-muted text-sm font-medium mb-1">{categoryLabel}</Text>
              <Text className={`text-base ${categoryAccount ? 'text-white' : 'text-slate-500'}`}>
                {categoryAccount ? categoryAccount.name : `Select ${categoryLabel}`}
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Payment Account Selector */}
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30"
            onPress={() => paymentSheetRef.current?.present()}
          >
            <View>
              <Text className="text-muted text-sm font-medium mb-1">{paymentLabel}</Text>
              <Text className={`text-base ${paymentAccount ? 'text-white' : 'text-slate-500'}`}>
                {paymentAccount ? paymentAccount.name : `Select ${paymentLabel}`}
              </Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Date Picker */}
          <TouchableOpacity 
            className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30"
            onPress={() => setShowDatePicker(true)}
          >
            <View>
              <Text className="text-muted text-sm font-medium mb-1">Date</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color="#94a3b8" className="mr-2" />
                <Text className="text-white text-base">
                  {format(date, 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Description */}
          <View className="py-4 border-b border-border">
            <Text className="text-muted text-sm font-medium mb-2">Description</Text>
            <View className="flex-row items-center">
              <FileText size={16} color="#94a3b8" className="mr-2" />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
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

      {/* Save Button */}
      <View className="p-4 border-t border-border bg-card">
        <TouchableOpacity
          className={`h-14 rounded-xl items-center justify-center ${isPending ? 'bg-primary-500/50' : 'bg-primary-500'}`}
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-bold">
            {isPending ? 'Saving...' : 'Save Transaction'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Selectors */}
      <AccountSelectorSheet 
        ref={categorySheetRef} 
        title={`Select ${categoryLabel}`}
        type={categoryFilter}
        selectedId={categoryAccount?.id}
        onSelect={setCategoryAccount}
      />
      <AccountSelectorSheet 
        ref={paymentSheetRef} 
        title={`Select ${paymentLabel}`}
        type={paymentFilter}
        selectedId={paymentAccount?.id}
        onSelect={setPaymentAccount}
      />
    </KeyboardAvoidingView>
  );
}
