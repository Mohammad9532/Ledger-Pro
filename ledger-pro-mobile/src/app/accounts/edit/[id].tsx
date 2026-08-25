import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../components/AppInput';
import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { ChevronDown, Check, ArrowLeft } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import api from '../../../api/api';
import { queryClient } from '../../_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrencySymbol } from '../../../utils/format';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255),
  type: z.enum(['cash', 'bank', 'credit_card', 'asset', 'liability', 'equity'], { required_error: 'Type is required' }),
  opening_balance: z.string().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const ACCOUNT_TYPES = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank Account' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'asset', label: 'Other Asset' },
  { id: 'liability', label: 'Other Liability' },
  { id: 'equity', label: 'Equity' },
];

export default function EditAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const currencySymbol = getCurrencySymbol();
  
  // Track if this is a system account so we can lock the type
  const [isSystem, setIsSystem] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'bank',
      opening_balance: '0',
    }
  });

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const { data } = await api.get(`/accounts/${id}`);
        setIsSystem(data.is_system || false);
        reset({
          name: data.name,
          type: data.type,
          opening_balance: data.opening_balance ? String(Math.abs(parseFloat(data.opening_balance))) : '0',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to load account details');
        router.back();
      } finally {
        setIsFetching(false);
      }
    };
    fetchAccount();
  }, [id]);

  const onSubmit = async (data: AccountForm) => {
    try {
      setIsLoading(true);
      
      const payload = {
        name: data.name,
        type: data.type,
        opening_balance: parseFloat(data.opening_balance || '0'),
      };

      await api.put(`/accounts/${id}`, payload);
      
      // Clear cache so the directory and statements refetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountStatement', Number(id)] });
      
      Alert.alert(
        'Success',
        'Account updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'An error occurred';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="px-4 py-3 flex-row items-center border-b border-slate-800">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2 rounded-full active:bg-slate-800">
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Edit Account</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <AppCard>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Account Name"
                  placeholder="e.g. Chase Checking"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field: { value } }) => {
                const selected = ACCOUNT_TYPES.find(t => t.id === value);
                return (
                  <View className="mb-4">
                    <Text className="text-sm text-slate-400 font-medium mb-1.5 ml-1">Account Type</Text>
                    <TouchableOpacity 
                      className="flex-row items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 h-14"
                      onPress={() => {
                        if (isSystem) {
                          Alert.alert('Restricted', 'You cannot change the type of a system-managed account.');
                          return;
                        }
                        bottomSheetRef.current?.present();
                      }}
                      style={{ opacity: isSystem ? 0.7 : 1 }}
                    >
                      <Text className="text-white text-base">{selected ? selected.label : (value || 'Select Type')}</Text>
                      {!isSystem && <ChevronDown size={20} color="#94a3b8" />}
                    </TouchableOpacity>
                    {errors.type && <Text className="text-red-500 text-sm mt-1">{errors.type.message}</Text>}
                  </View>
                );
              }}
            />

            <Controller
              control={control}
              name="opening_balance"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label={`Opening Balance (${currencySymbol})`}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  onBlur={onBlur}
                  onChangeText={text => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    onChange(filtered);
                  }}
                  value={value}
                  error={errors.opening_balance?.message}
                />
              )}
            />

            <View className="mt-4">
              <AppButton
                title="Save Changes"
                onPress={handleSubmit(onSubmit)}
                isLoading={isLoading}
              />
            </View>
          </AppCard>
        </ScrollView>

        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: '#1e293b' }}
          handleIndicatorStyle={{ backgroundColor: '#475569' }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" opacity={0.5} />
          )}
        >
          <View className="px-4 pb-2 border-b border-slate-700">
            <Text className="text-white text-lg font-bold">Account Type</Text>
          </View>
          <BottomSheetFlatList
            data={ACCOUNT_TYPES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = watch('type') === item.id;
              return (
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-4 border-b border-slate-800 ${isSelected ? 'bg-primary-900/20' : ''}`}
                  onPress={() => {
                    setValue('type', item.id as any, { shouldValidate: true, shouldDirty: true });
                    bottomSheetRef.current?.dismiss();
                  }}
                >
                  <Text className={`text-base ${isSelected ? 'text-primary-500 font-bold' : 'text-slate-200'}`}>
                    {item.label}
                  </Text>
                  {isSelected && <Check size={20} color="#f97316" />}
                </TouchableOpacity>
              );
            }}
          />
        </BottomSheetModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
