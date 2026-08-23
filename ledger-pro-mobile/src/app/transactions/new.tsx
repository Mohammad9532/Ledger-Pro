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
import api from '../../api/api';

import { AmountInput } from '../../features/transactions/components/AmountInput';
import { AccountSelectorSheet } from '../../features/transactions/components/AccountSelectorSheet';
import { useCreateTransaction, TransactionPayload } from '../../features/transactions/api/transactions';
import { Account } from '../../features/accounts/api/accounts';
import { ContactSelectorSheet } from '../../features/transactions/components/ContactSelectorSheet';
import { Contact } from '../../features/accounts/api/contacts';

export default function NewTransactionScreen() {
  const { type, person_id, person_name, account_id, account_name, account_type } = useLocalSearchParams<{ 
    type: string, person_id?: string, person_name?: string, 
    account_id?: string, account_name?: string, account_type?: string 
  }>();
  const txType = (type || 'expense') as string;

  if (txType === 'journal') {
    return <JournalTransactionScreen />;
  }

  return (
    <StandardTransactionScreen 
      txType={txType} 
      initialPersonId={person_id} 
      initialPersonName={person_name} 
      initialAccountId={account_id}
      initialAccountName={account_name}
      initialAccountType={account_type}
    />
  );
}

function StandardTransactionScreen({ 
  txType, initialPersonId, initialPersonName, initialAccountId, initialAccountName, initialAccountType 
}: { 
  txType: string, initialPersonId?: string, initialPersonName?: string, 
  initialAccountId?: string, initialAccountName?: string, initialAccountType?: string 
}) {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // General Selection State
  const defaultAccount = initialAccountId && initialAccountName && initialAccountType 
    ? { id: Number(initialAccountId), name: initialAccountName, type: initialAccountType as Account['type'] } as Account 
    : null;

  const [fromAccount, setFromAccount] = useState<Account | null>(txType === 'expense' || txType === 'give_money' || txType === 'transfer' ? defaultAccount : null);
  const [toAccount, setToAccount] = useState<Account | null>(txType === 'income' || txType === 'receive_money' ? defaultAccount : null);
  const [category, setCategory] = useState<Account | null>(null);
  const [person, setPerson] = useState<Contact | null>(
    initialPersonId && initialPersonName ? { id: Number(initialPersonId), name: initialPersonName } as Contact : null
  );
  
  // CC Multiple Sources State
  const [ccPaymentSources, setCcPaymentSources] = useState<{ account: Account | null; amount: string }[]>([
    { account: null, amount: '' }
  ]);
  const [activeSourceIndex, setActiveSourceIndex] = useState<number | null>(null);

  // Overpayment State
  const [selectedPersonBalance, setSelectedPersonBalance] = useState<number | null>(null);
  const [overpaymentHandling, setOverpaymentHandling] = useState<'customer_credit' | 'income' | ''>('');
  const [overpaymentIncomeAccount, setOverpaymentIncomeAccount] = useState<Account | null>(null);
  
  // Sheet Refs
  const fromSheetRef = useRef<BottomSheetModal>(null);
  const toSheetRef = useRef<BottomSheetModal>(null);
  const categorySheetRef = useRef<BottomSheetModal>(null);
  const personSheetRef = useRef<BottomSheetModal>(null);

  const { mutate: createTransaction, isPending } = useCreateTransaction();

  React.useEffect(() => {
    if (person && (txType === 'receive_money' || txType === 'give_money')) {
      api.get(`/contacts/${person.id}`).then(res => {
         const bal = parseFloat(res.data.computed_balance || '0');
         setSelectedPersonBalance(bal);
      }).catch(() => setSelectedPersonBalance(null));
    } else {
      setSelectedPersonBalance(null);
    }
  }, [person?.id, txType]);

  // Field configurations based on type
  const config = useMemo(() => {
    switch (txType) {
      case 'give_money':
        return {
          title: 'Give Money',
          showPerson: true, personLabel: 'Person',
          showFrom: true, fromLabel: 'Pay From', fromFilter: ['cash', 'bank', 'credit_card'],
          showTo: false, showCategory: false,
        };
      case 'receive_money':
        return {
          title: 'Receive Money',
          showPerson: true, personLabel: 'Person',
          showTo: true, toLabel: 'Receive Into', toFilter: ['cash', 'bank'],
          showFrom: false, showCategory: false,
        };
      case 'expense':
        return {
          title: 'New Expense',
          showCategory: true, categoryLabel: 'Category', categoryFilter: ['expense'],
          showFrom: true, fromLabel: 'Pay From', fromFilter: ['cash', 'bank', 'credit_card', 'asset'],
          showTo: false, showPerson: false,
        };
      case 'income':
        return {
          title: 'New Income',
          showFrom: true, fromLabel: 'Income Source', fromFilter: ['income'],
          showTo: true, toLabel: 'Receive Into', toFilter: ['cash', 'bank', 'asset'],
          showPerson: true, personLabel: 'Paid By (Optional)',
          showCategory: false,
        };
      case 'transfer':
        return {
          title: 'New Transfer',
          showFrom: true, fromLabel: 'From Account', fromFilter: ['cash', 'bank', 'credit_card', 'asset', 'liability', 'business'],
          showTo: true, toLabel: 'To Account', toFilter: ['cash', 'bank', 'credit_card', 'asset', 'liability', 'business'],
          showCategory: false, showPerson: false,
        };
      case 'cc_payment':
      case 'credit_card_payment':
        return {
          title: 'CC Payment',
          showTo: true, toLabel: 'Credit Card', toFilter: ['credit_card'],
          showFrom: false, fromLabel: 'Payment Source', fromFilter: ['cash', 'bank', 'asset'],
          showCategory: false, showPerson: false,
        };
      case 'third_party_transfer':
      case 'settlement':
        return {
          title: 'Settlement',
          showFrom: true, fromLabel: 'Paid By (Person)', fromFilter: ['person'], // Needs person contact handling separately
          showTo: true, toLabel: 'Received By (Person)', toFilter: ['person'],
          showCategory: false, showPerson: false,
        };
      default:
        return { title: 'New Transaction', showFrom: false, showTo: false, showCategory: false, showPerson: false };
    }
  }, [txType]);

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

  const handleBack = () => {
    const safeBack = () => router.canGoBack() ? router.back() : router.replace('/');
    if (amount || description) {
      Alert.alert('Discard changes?', 'You have unsaved changes. Are you sure you want to discard them?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: safeBack }
      ]);
    } else {
      safeBack();
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const amt = parseFloat(amount);
    
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    // Build Entries
    let entries: TransactionPayload['entries'] = [];
    let payloadTxType = txType;

    switch (txType) {
      case 'give_money':
        if (!person || !fromAccount) { Alert.alert('Error', 'Please select a Person and Pay From account.'); return; }
        entries = [
          { account_id: person.account_id, debit: amt, credit: 0 },
          { account_id: fromAccount.id, debit: 0, credit: amt },
        ];
        break;
      case 'receive_money':
        if (!person || !toAccount) { Alert.alert('Error', 'Please select a Person and Receive Into account.'); return; }
        const isOverpayment = selectedPersonBalance !== null && amt > selectedPersonBalance;
        if (isOverpayment && !overpaymentHandling) {
          Alert.alert('Error', 'Please select how to handle the overpayment.'); return;
        }
        if (isOverpayment && overpaymentHandling === 'income' && !overpaymentIncomeAccount) {
          Alert.alert('Error', 'Please select an income account for the overpayment.'); return;
        }
        // Handled semantically, no manual entries for receive_money
        break;
      case 'expense':
        if (!category || !fromAccount) { Alert.alert('Error', 'Please select a Category and Pay From account.'); return; }
        entries = [
          { account_id: category.id, debit: amt, credit: 0 },
          { account_id: fromAccount.id, debit: 0, credit: amt },
        ];
        break;
      case 'income':
        if (!fromAccount || !toAccount) { Alert.alert('Error', 'Please select Income Source and Receive Into account.'); return; }
        entries = [
          { account_id: toAccount.id, debit: amt, credit: 0 },
          { account_id: fromAccount.id, debit: 0, credit: amt },
        ];
        break;
      case 'transfer':
        if (!fromAccount || !toAccount) { Alert.alert('Error', 'Please select From and To accounts.'); return; }
        if (fromAccount.id === toAccount.id) { Alert.alert('Error', 'Source and destination must be different.'); return; }
        entries = [
          { account_id: toAccount.id, debit: amt, credit: 0 },
          { account_id: fromAccount.id, debit: 0, credit: amt },
        ];
        break;
      case 'cc_payment':
      case 'credit_card_payment':
        if (!toAccount) { Alert.alert('Error', 'Please select a Credit Card.'); return; }
        
        const totalSources = ccPaymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        if (Math.abs(totalSources - amt) > 0.001) {
          Alert.alert('Validation Error', 'Total sum of payment sources must equal the Payment Amount.');
          return;
        }

        payloadTxType = 'credit_card_payment';
        entries = [
          { account_id: toAccount.id, debit: amt, credit: 0 }
        ];

        for (const source of ccPaymentSources) {
          const sAmt = parseFloat(source.amount);
          if (!source.account || isNaN(sAmt) || sAmt <= 0) {
            Alert.alert('Validation Error', 'All payment sources must have a valid account and amount greater than 0.');
            return;
          }
          entries.push({ account_id: source.account.id, debit: 0, credit: sAmt });
        }
        break;
      case 'third_party_transfer':
      case 'settlement':
        if (!fromAccount || !toAccount) { Alert.alert('Error', 'Please select Paid By and Received By accounts.'); return; }
        payloadTxType = 'settlement';
        entries = [
          { account_id: toAccount.id, debit: amt, credit: 0 },
          { account_id: fromAccount.id, debit: 0, credit: amt },
        ];
        break;
    }

    const payload: any = {
      type: payloadTxType,
      amount: amt,
      date: format(date, 'yyyy-MM-dd'),
      description,
    };

    if (txType === 'receive_money') {
      const isOverpayment = selectedPersonBalance !== null && amt > selectedPersonBalance;
      payload.bank_account_id = toAccount?.id;
      payload.person_account_id = person?.account_id;
      if (isOverpayment) {
         payload.overpayment_handling = overpaymentHandling;
         if (overpaymentHandling === 'income') {
            payload.income_account_id = overpaymentIncomeAccount?.id;
         }
      }
    } else {
      payload.entries = entries;
    }

    if (person && (txType === 'income' || txType === 'give_money' || txType === 'receive_money')) {
      payload.contact_id = person.id;
    }

    const handleBackNavigation = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    };

    createTransaction(payload, {
      onSuccess: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.removeItem(`draft_${txType}`);
        Toast.show({ type: 'success', text1: '✓ Transaction Saved', visibilityTime: 1500 });
        handleBackNavigation();
      },
      onError: (error: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save transaction';
        Alert.alert('Error', errorMessage);
      }
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-border bg-card">
        <TouchableOpacity onPress={handleBack} className="p-2 -ml-2"><ArrowLeft size={24} color="#f8fafc" /></TouchableOpacity>
        <Text className="text-white text-lg font-bold">{config.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <AmountInput value={amount} onChange={setAmount} />

        <View className="px-6 pb-12">
          {config.showPerson && (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => personSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">{config.personLabel}</Text>
                <Text className={`text-base ${person ? 'text-white' : 'text-slate-500'}`}>{person ? person.name : `Select ${config.personLabel}`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {config.showCategory && (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => categorySheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">{config.categoryLabel}</Text>
                <Text className={`text-base ${category ? 'text-white' : 'text-slate-500'}`}>{category ? category.name : `Select ${config.categoryLabel}`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {config.showTo && (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => toSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">{config.toLabel}</Text>
                <Text className={`text-base ${toAccount ? 'text-white' : 'text-slate-500'}`}>{toAccount ? toAccount.name : `Select ${config.toLabel}`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {config.showFrom && (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => fromSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">{config.fromLabel}</Text>
                <Text className={`text-base ${fromAccount ? 'text-white' : 'text-slate-500'}`}>{fromAccount ? fromAccount.name : `Select ${config.fromLabel}`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Overpayment UI */}
          {(() => {
            const amt = parseFloat(amount) || 0;
            if (txType === 'receive_money' && person && selectedPersonBalance !== null && amt > selectedPersonBalance) {
              const extra = amt - Math.max(0, selectedPersonBalance);
              return (
                <View className="pt-4 border-t border-border mt-2">
                  <View className="mb-4">
                    <Text className="font-semibold text-rose-500 text-base mb-2">Overpayment Detected</Text>
                    <View className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <Text className="text-muted text-sm mb-1">Customer Outstanding: <Text className="font-bold text-white">${Math.max(0, selectedPersonBalance).toFixed(2)}</Text></Text>
                      <Text className="text-muted text-sm mb-1">Amount Received: <Text className="font-bold text-emerald-500">${amt.toFixed(2)}</Text></Text>
                      <Text className="text-muted text-sm">Extra Received: <Text className="font-bold text-rose-500">${extra.toFixed(2)}</Text></Text>
                    </View>
                  </View>

                  <Text className="text-white font-medium mb-3">How should the extra amount be handled?</Text>
                  
                  <View className="space-y-3">
                    <TouchableOpacity 
                      className={`p-3 rounded-xl border flex-row items-start ${overpaymentHandling === 'customer_credit' ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50'}`}
                      onPress={() => setOverpaymentHandling('customer_credit')}
                    >
                      <View className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 mt-0.5 ${overpaymentHandling === 'customer_credit' ? 'border-primary-500' : 'border-slate-500'}`}>
                        {overpaymentHandling === 'customer_credit' && <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">Keep as Customer Credit</Text>
                        <Text className="text-slate-400 text-xs mt-1">The extra amount remains as a credit on the customer's account for future use.</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      className={`p-3 rounded-xl border flex-row items-start ${overpaymentHandling === 'income' ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50'}`}
                      onPress={() => setOverpaymentHandling('income')}
                    >
                      <View className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 mt-0.5 ${overpaymentHandling === 'income' ? 'border-primary-500' : 'border-slate-500'}`}>
                        {overpaymentHandling === 'income' && <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">Adjust as Income</Text>
                        <Text className="text-slate-400 text-xs mt-1">The extra amount is recognized as income.</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {overpaymentHandling === 'income' && (
                    <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border mt-4" onPress={() => categorySheetRef.current?.present()}>
                      <View>
                        <Text className="text-muted text-sm font-medium mb-1">Income Account</Text>
                        <Text className={`text-base ${overpaymentIncomeAccount ? 'text-white' : 'text-slate-500'}`}>
                          {overpaymentIncomeAccount ? overpaymentIncomeAccount.name : 'Select Income Account'}
                        </Text>
                      </View>
                      <ChevronRight size={20} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            return null;
          })()}

          {/* Date Picker */}
          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => setShowDatePicker(true)}>
            <View>
              <Text className="text-muted text-sm font-medium mb-1">Date</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color="#94a3b8" className="mr-2" />
                <Text className="text-white text-base">{format(date, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Description */}
          <View className="py-4 border-b border-border">
            <Text className="text-muted text-sm font-medium mb-2">Description</Text>
            <View className="flex-row items-center">
              <FileText size={16} color="#94a3b8" className="mr-2" />
              <TextInput value={description} onChangeText={setDescription} placeholder="What was this for?" placeholderTextColor="#64748b" className="flex-1 text-white text-base" />
            </View>
          </View>

          {/* Multiple Payment Sources for CC Payment */}
          {(txType === 'cc_payment' || txType === 'credit_card_payment') ? (
            <View className="pt-4 border-t border-border mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white font-semibold">Payment Sources</Text>
                <TouchableOpacity 
                  className="bg-primary-500/20 px-3 py-1.5 rounded-lg"
                  onPress={() => setCcPaymentSources([...ccPaymentSources, { account: null, amount: '' }])}
                >
                  <Text className="text-primary-500 text-sm font-medium">+ Add Source</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-4">
                {ccPaymentSources.map((source, idx) => (
                  <View key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-muted text-sm font-medium">Source {idx + 1}</Text>
                      {ccPaymentSources.length > 1 ? (
                        <TouchableOpacity onPress={() => {
                          const newSources = [...ccPaymentSources];
                          newSources.splice(idx, 1);
                          setCcPaymentSources(newSources);
                        }}>
                          <Text className="text-rose-500 text-sm">Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <TouchableOpacity 
                      className="flex-row items-center justify-between py-3 border-b border-slate-700 mb-3"
                      onPress={() => {
                        setActiveSourceIndex(idx);
                        fromSheetRef.current?.present();
                      }}
                    >
                      <View>
                        <Text className={`text-base ${source.account ? 'text-white' : 'text-slate-500'}`}>
                          {source.account ? source.account.name : 'Select Account'}
                        </Text>
                      </View>
                      <ChevronRight size={20} color="#64748b" />
                    </TouchableOpacity>

                    <View className="flex-row items-center border-b border-slate-700 py-2">
                      <Text className="text-muted text-base mr-2">$</Text>
                      <TextInput 
                        value={source.amount}
                        onChangeText={(val) => {
                          const newSources = [...ccPaymentSources];
                          newSources[idx].amount = val;
                          setCcPaymentSources(newSources);
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        className="flex-1 text-white text-base"
                      />
                    </View>
                  </View>
                ))}
              </View>

              {amount && parseFloat(amount) > 0 ? (
                <View className="mt-4 p-4 rounded-xl bg-slate-800 flex-row justify-between items-center border border-slate-700">
                  <View>
                    <Text className="text-muted text-sm mb-1">Total Paid</Text>
                    <Text className={`font-bold ${Math.abs(ccPaymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) - parseFloat(amount)) < 0.001 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ${ccPaymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toFixed(2)} / ${parseFloat(amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 border-t border-border bg-card">
        <TouchableOpacity className={`h-14 rounded-xl items-center justify-center ${isPending ? 'bg-primary-500/50' : 'bg-primary-500'}`} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>
          <Text className="text-white text-base font-bold">{isPending ? 'Saving...' : 'Save Transaction'}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(e, selected) => { setShowDatePicker(false); if (selected) setDate(selected); }} />
      )}
      <ContactSelectorSheet ref={personSheetRef} title={`Select ${config.personLabel}`} selectedId={person?.id} onSelect={setPerson} />
      <AccountSelectorSheet 
        ref={categorySheetRef} 
        title={overpaymentHandling === 'income' ? 'Select Income Account' : `Select ${config.categoryLabel}`} 
        allowedTypes={overpaymentHandling === 'income' ? ['income'] : config.categoryFilter} 
        selectedId={overpaymentHandling === 'income' ? overpaymentIncomeAccount?.id : category?.id} 
        onSelect={(acc) => {
          if (overpaymentHandling === 'income') {
            setOverpaymentIncomeAccount(acc);
          } else {
            setCategory(acc);
          }
        }} 
      />
      <AccountSelectorSheet 
        ref={fromSheetRef} 
        title={`Select ${config.fromLabel}`} 
        allowedTypes={config.fromFilter} 
        selectedId={(txType === 'cc_payment' || txType === 'credit_card_payment') ? ccPaymentSources[activeSourceIndex ?? 0]?.account?.id : fromAccount?.id} 
        onSelect={(account) => {
          if (txType === 'cc_payment' || txType === 'credit_card_payment') {
            if (activeSourceIndex !== null) {
              const newSources = [...ccPaymentSources];
              newSources[activeSourceIndex].account = account;
              
              if (amount && parseFloat(amount) > 0 && !newSources[activeSourceIndex].amount) {
                const currentSum = newSources.reduce((sum, s, i) => i !== activeSourceIndex ? sum + (parseFloat(s.amount) || 0) : sum, 0);
                const remainder = parseFloat(amount) - currentSum;
                if (remainder > 0) {
                  newSources[activeSourceIndex].amount = remainder.toString();
                }
              }

              setCcPaymentSources(newSources);
              setActiveSourceIndex(null);
            }
          } else {
            setFromAccount(account);
          }
        }} 
      />
      <AccountSelectorSheet ref={toSheetRef} title={`Select ${config.toLabel}`} allowedTypes={config.toFilter} selectedId={toAccount?.id} onSelect={setToAccount} />
    </KeyboardAvoidingView>
  );
}
