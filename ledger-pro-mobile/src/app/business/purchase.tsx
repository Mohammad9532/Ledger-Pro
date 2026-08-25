import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, FileText, ChevronRight, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSelectorSheet } from '../../features/transactions/components/AccountSelectorSheet';
import { ContactSelectorSheet } from '../../features/transactions/components/ContactSelectorSheet';
import { useCreateBusinessItem } from '../../features/business/api/business';
import { Account } from '../../features/accounts/api/accounts';
import { Contact } from '../../features/accounts/api/contacts';

export default function NewBusinessPurchaseScreen() {
  const router = useRouter();
  const { mutate: createPurchase, isPending } = useCreateBusinessItem();

  const [description, setDescription] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Payment Type
  const [isCredit, setIsCredit] = useState(false);
  
  const [paymentAccount, setPaymentAccount] = useState<Account | null>(null);
  const [supplierContact, setSupplierContact] = useState<Contact | null>(null);

  // Cashback
  const [cashbackAmount, setCashbackAmount] = useState('');
  const [cashbackAccount, setCashbackAccount] = useState<Account | null>(null);

  // Refs
  const paymentSheetRef = useRef<BottomSheetModal>(null);
  const supplierSheetRef = useRef<BottomSheetModal>(null);
  const cashbackSheetRef = useRef<BottomSheetModal>(null);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return;
    }
    
    const cost = parseFloat(purchaseCost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid purchase cost.');
      return;
    }

    if (isCredit && !supplierContact) {
      Alert.alert('Validation Error', 'Please select a supplier for credit purchases.');
      return;
    }

    if (!isCredit && !paymentAccount) {
      Alert.alert('Validation Error', 'Please select a payment account for direct payments.');
      return;
    }

    const cbAmt = parseFloat(cashbackAmount) || 0;
    if (cbAmt > 0 && !cashbackAccount) {
      Alert.alert('Validation Error', 'Please select an asset account to receive the cashback.');
      return;
    }

    const payload: any = {
      description,
      purchase_cost: cost,
      date: format(date, 'yyyy-MM-dd'),
      is_credit: isCredit,
    };

    if (isCredit) {
      payload.supplier_contact_id = supplierContact!.id;
    } else {
      payload.payment_account_id = paymentAccount!.id;
    }

    if (cbAmt > 0) {
      payload.cashback_amount = cbAmt;
      payload.cashback_account_id = cashbackAccount!.id;
    }

    createPurchase(payload, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: '✓ Purchase Recorded', visibilityTime: 1500 });
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/business');
        }
      },
      onError: (error: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to record purchase';
        Alert.alert('Error', errorMessage);
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border flex-row items-center justify-between z-10">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/business')} className="w-10 h-10 items-center justify-center rounded-full bg-slate-800">
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">New Business Purchase</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Total Cost Input */}
        <View className="items-center justify-center py-10 bg-card border-b border-border">
          <Text className="text-muted text-sm font-medium mb-4">Total Cost</Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-4xl font-bold mr-1">$</Text>
            <TextInput
              value={purchaseCost}
              onChangeText={setPurchaseCost}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#475569"
              className="text-white text-6xl font-bold h-20 min-w-[150px] text-center"
              autoFocus
            />
          </View>
        </View>

        <View className="px-6 py-6 space-y-4">
          
          <View className="py-2 border-b border-border">
            <Text className="text-muted text-sm font-medium mb-2">Item Description</Text>
            <View className="flex-row items-center">
              <FileText size={16} color="#94a3b8" className="mr-2" />
              <TextInput 
                value={description} 
                onChangeText={setDescription} 
                placeholder="e.g., Flight Ticket, Package..." 
                placeholderTextColor="#64748b" 
                className="flex-1 text-white text-base" 
              />
            </View>
          </View>

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

          <View className="py-4 border-b border-border flex-row items-center justify-between">
            <View>
              <Text className="text-white text-base font-medium">Credit Purchase</Text>
              <Text className="text-muted text-sm">Pay supplier later</Text>
            </View>
            <Switch
              value={isCredit}
              onValueChange={setIsCredit}
              trackColor={{ false: '#334155', true: '#f97316' }}
              thumbColor="#ffffff"
            />
          </View>

          {isCredit ? (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => supplierSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">Supplier</Text>
                <Text className={`text-base ${supplierContact ? 'text-white' : 'text-slate-500'}`}>{supplierContact ? supplierContact.name : `Select Supplier`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => paymentSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">Payment Account</Text>
                <Text className={`text-base ${paymentAccount ? 'text-white' : 'text-slate-500'}`}>{paymentAccount ? paymentAccount.name : `Select Payment Source`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Cashback Section */}
          <View className="mt-6 pt-4 border-t border-border">
            <Text className="text-white font-semibold mb-4">Cashback (Optional)</Text>
            
            <View className="flex-row items-center border-b border-slate-700 py-2 mb-4">
              <Text className="text-muted text-base mr-2">$</Text>
              <TextInput 
                value={cashbackAmount}
                onChangeText={setCashbackAmount}
                keyboardType="decimal-pad"
                placeholder="Cashback Amount"
                placeholderTextColor="#64748b"
                className="flex-1 text-white text-base"
              />
            </View>

            {parseFloat(cashbackAmount) > 0 && (
              <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-slate-700 mb-3" onPress={() => cashbackSheetRef.current?.present()}>
                <View>
                  <Text className="text-muted text-sm font-medium mb-1">Receive Cashback Into</Text>
                  <Text className={`text-base ${cashbackAccount ? 'text-white' : 'text-slate-500'}`}>
                    {cashbackAccount ? cashbackAccount.name : 'Select Asset / Bank Account'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 border-t border-border bg-card absolute bottom-0 left-0 right-0">
        <TouchableOpacity className={`h-14 rounded-xl items-center justify-center ${isPending ? 'bg-primary-500/50' : 'bg-primary-500'}`} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>
          <Text className="text-white text-base font-bold">{isPending ? 'Saving...' : 'Record Purchase'}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(e, selected) => { setShowDatePicker(false); if (selected) setDate(selected); }} />
      )}
      <ContactSelectorSheet ref={supplierSheetRef} title="Select Supplier" selectedId={supplierContact?.id} onSelect={setSupplierContact} />
      <AccountSelectorSheet ref={paymentSheetRef} title="Select Payment Account" allowedTypes={['cash', 'bank', 'credit_card']} selectedId={paymentAccount?.id} onSelect={setPaymentAccount} />
      <AccountSelectorSheet ref={cashbackSheetRef} title="Select Cashback Account" allowedTypes={['asset', 'bank', 'cash']} selectedId={cashbackAccount?.id} onSelect={setCashbackAccount} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
