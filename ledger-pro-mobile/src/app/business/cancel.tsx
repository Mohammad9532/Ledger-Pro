import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';

import { AccountSelectorSheet } from '../../features/transactions/components/AccountSelectorSheet';
import { Account } from '../../features/accounts/api/accounts';
import { useCancelBusinessItem, useBusinessItems } from '../../features/business/api/business';
import { AmountInput } from '../../features/transactions/components/AmountInput';

export default function CancelBusinessItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Find the item from cache or we could fetch it
  const { data: listData } = useBusinessItems();
  const item = listData?.data?.find(i => i.id.toString() === id);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [supplierRefundAmount, setSupplierRefundAmount] = useState('');
  const [customerRefundAmount, setCustomerRefundAmount] = useState('');
  const [refundAccount, setRefundAccount] = useState<Account | null>(null);
  const [notes, setNotes] = useState('');

  const accountSheetRef = useRef<BottomSheetModal>(null);

  const cancelMutation = useCancelBusinessItem();

  const handleSave = () => {
    if (!refundAccount) {
      Alert.alert('Missing Field', 'Please select a Refund Account.');
      return;
    }
    
    // In web: cancelForm: { date, supplier_refund_amount, customer_refund_amount, refund_account_id, notes }
    const payload = {
      date: format(date, 'yyyy-MM-dd'),
      supplier_refund_amount: supplierRefundAmount || '0',
      customer_refund_amount: customerRefundAmount || '0',
      refund_account_id: refundAccount.id,
      notes: notes
    };

    cancelMutation.mutate({ id: Number(id), data: payload }, {
      onSuccess: () => {
        Toast.show({ type: 'success', text1: 'Business item cancelled successfully' });
        router.back();
      },
      onError: (err: any) => {
        Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to cancel item');
      }
    });
  };

  if (!item) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-white">Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-4"><Text className="text-primary-500">Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const supplierFee = Math.max(0, parseFloat(item.purchase_cost || '0') - parseFloat(supplierRefundAmount || '0'));
  const customerCharge = Math.max(0, parseFloat(item.sale_amount || '0') - parseFloat(customerRefundAmount || '0'));
  const netProfit = customerCharge - supplierFee;

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background" 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-800/50">
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Cancel Ticket</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-card p-4 rounded-2xl border border-border mb-6">
          <Text className="text-muted text-xs uppercase font-bold mb-1">Cancelling Item</Text>
          <Text className="text-white text-base font-bold">{item.description}</Text>
        </View>

        {/* Date */}
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">Cancellation Date</Text>
        <TouchableOpacity
          className="bg-card border border-border rounded-xl p-4 flex-row justify-between items-center mb-5"
          onPress={() => setShowDatePicker(true)}
        >
          <View className="flex-row items-center">
            <CalendarIcon size={20} color="#94a3b8" />
            <Text className="text-white ml-3 text-base">{format(date, 'MMM dd, yyyy')}</Text>
          </View>
        </TouchableOpacity>
        
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

        {/* Supplier Refund */}
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">Supplier Refund Amount</Text>
        <AmountInput 
          value={supplierRefundAmount}
          onChangeText={setSupplierRefundAmount}
          placeholder="0.00"
          className="mb-2"
        />
        <Text className="text-muted text-xs ml-1 mb-5">Airline's Cancellation Fee: ₹{supplierFee.toFixed(2)}</Text>

        {/* Customer Refund */}
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">Customer Refund Amount</Text>
        <AmountInput 
          value={customerRefundAmount}
          onChangeText={setCustomerRefundAmount}
          placeholder="0.00"
          className="mb-2"
        />
        <Text className="text-muted text-xs ml-1 mb-5">Your Cancellation Charge: ₹{customerCharge.toFixed(2)}</Text>

        {/* Refund Account */}
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">Refund Account</Text>
        <TouchableOpacity
          className="bg-card border border-border rounded-xl p-4 flex-row justify-between items-center mb-5"
          onPress={() => accountSheetRef.current?.present()}
        >
          <Text className={refundAccount ? 'text-white' : 'text-slate-500'}>
            {refundAccount ? refundAccount.name : 'Select Account'}
          </Text>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>

        {/* Net Profit Summary */}
        <View className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 mb-5 flex-row justify-between items-center">
          <Text className="text-slate-300">Net Profit on Cancellation</Text>
          <Text className={`font-bold text-lg ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ₹{netProfit.toFixed(2)}
          </Text>
        </View>

        {/* Notes */}
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">Notes (Optional)</Text>
        <TextInput
          className="bg-card border border-border rounded-xl p-4 text-white text-base mb-10 min-h-[100]"
          placeholder="Reason for cancellation..."
          placeholderTextColor="#64748b"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Footer */}
      <View className="p-4 bg-card border-t border-border">
        <TouchableOpacity
          className={`py-4 rounded-xl items-center ${cancelMutation.isPending ? 'bg-red-500/50' : 'bg-red-500'}`}
          onPress={handleSave}
          disabled={cancelMutation.isPending}
        >
          <Text className="text-white font-bold text-base">
            {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
          </Text>
        </TouchableOpacity>
      </View>

      <AccountSelectorSheet
        ref={accountSheetRef}
        onSelect={(acc) => {
          setRefundAccount(acc);
          accountSheetRef.current?.dismiss();
        }}
        excludeTypes={[]}
      />
    </KeyboardAvoidingView>
  );
}
