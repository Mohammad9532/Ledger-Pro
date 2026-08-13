import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';

import { AccountSelectorSheet } from '../../features/transactions/components/AccountSelectorSheet';
import { ContactSelectorSheet } from '../../features/transactions/components/ContactSelectorSheet';
import { useSellBusinessItem } from '../../features/business/api/business';
import { Account } from '../../features/accounts/api/accounts';
import { Contact } from '../../features/accounts/api/contacts';

export default function BusinessSaleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { mutate: recordSale, isPending } = useSellBusinessItem();

  const [saleAmount, setSaleAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Payment Type
  const [isCredit, setIsCredit] = useState(false);
  
  const [paymentAccount, setPaymentAccount] = useState<Account | null>(null);
  const [buyerContact, setBuyerContact] = useState<Contact | null>(null);

  // Refs
  const paymentSheetRef = useRef<BottomSheetModal>(null);
  const buyerSheetRef = useRef<BottomSheetModal>(null);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!id) {
      Alert.alert('Error', 'Invalid item ID.');
      return;
    }

    const amt = parseFloat(saleAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid sale amount.');
      return;
    }

    if (isCredit && !buyerContact) {
      Alert.alert('Validation Error', 'Please select a buyer for credit sales.');
      return;
    }

    if (!isCredit && !paymentAccount) {
      Alert.alert('Validation Error', 'Please select an account where you received the payment.');
      return;
    }

    const payload: any = {
      sale_amount: amt,
      date: format(date, 'yyyy-MM-dd'),
      is_credit: isCredit,
    };

    if (isCredit) {
      payload.buyer_contact_id = buyerContact!.id;
    } else {
      payload.payment_account_id = paymentAccount!.id;
    }

    recordSale({ id: parseInt(id), data: payload }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: '✓ Sale Recorded', visibilityTime: 1500 });
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/business');
        }
      },
      onError: (error: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to record sale';
        Alert.alert('Error', errorMessage);
      }
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border flex-row items-center justify-between z-10">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/business')} className="w-10 h-10 items-center justify-center rounded-full bg-slate-800">
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Record Sale</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Sale Amount Input */}
        <View className="items-center justify-center py-10 bg-card border-b border-border">
          <Text className="text-muted text-sm font-medium mb-4">Sale Amount</Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-4xl font-bold mr-1">$</Text>
            <TextInput
              value={saleAmount}
              onChangeText={setSaleAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#475569"
              className="text-white text-6xl font-bold h-20 min-w-[150px] text-center"
              autoFocus
            />
          </View>
        </View>

        <View className="px-6 py-6 space-y-4">
          
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
              <Text className="text-white text-base font-medium">Credit Sale</Text>
              <Text className="text-muted text-sm">Customer will pay later</Text>
            </View>
            <Switch
              value={isCredit}
              onValueChange={setIsCredit}
              trackColor={{ false: '#334155', true: '#f97316' }}
              thumbColor="#ffffff"
            />
          </View>

          {isCredit ? (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => buyerSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">Customer / Buyer</Text>
                <Text className={`text-base ${buyerContact ? 'text-white' : 'text-slate-500'}`}>{buyerContact ? buyerContact.name : `Select Buyer`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border active:bg-border/30" onPress={() => paymentSheetRef.current?.present()}>
              <View>
                <Text className="text-muted text-sm font-medium mb-1">Receive Payment Into</Text>
                <Text className={`text-base ${paymentAccount ? 'text-white' : 'text-slate-500'}`}>{paymentAccount ? paymentAccount.name : `Select Bank or Cash`}</Text>
              </View>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 border-t border-border bg-card absolute bottom-0 left-0 right-0 pb-8">
        <TouchableOpacity className={`h-14 rounded-xl items-center justify-center ${isPending ? 'bg-primary-500/50' : 'bg-primary-500'}`} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>
          <Text className="text-white text-base font-bold">{isPending ? 'Saving...' : 'Record Sale'}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(e, selected) => { setShowDatePicker(false); if (selected) setDate(selected); }} />
      )}
      <ContactSelectorSheet ref={buyerSheetRef} title="Select Buyer" selectedId={buyerContact?.id} onSelect={setBuyerContact} />
      <AccountSelectorSheet ref={paymentSheetRef} title="Receive Into" allowedTypes={['cash', 'bank']} selectedId={paymentAccount?.id} onSelect={setPaymentAccount} />
    </KeyboardAvoidingView>
  );
}
