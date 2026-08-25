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

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().optional(),
  notes: z.string().optional(),
  opening_balance: z.string().optional(),
  opening_balance_type: z.enum(['receivable', 'payable']),
});

type ContactForm = z.infer<typeof contactSchema>;

const BALANCE_TYPES = [
  { id: 'receivable', label: 'They owe me (Receivable)' },
  { id: 'payable', label: 'I owe them (Payable)' },
];

export default function EditContactScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['30%', '40%'], []);
  const currencySymbol = getCurrencySymbol();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      opening_balance: '0',
      opening_balance_type: 'receivable',
    }
  });

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const { data } = await api.get(`/contacts/${id}`);
        reset({
          name: data.name,
          phone: data.phone || '',
          notes: data.notes || '',
          opening_balance: data.opening_balance ? String(Math.abs(parseFloat(data.opening_balance))) : '0',
          opening_balance_type: data.opening_balance_type || 'receivable',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to load contact details');
        router.back();
      } finally {
        setIsFetching(false);
      }
    };
    fetchContact();
  }, [id]);

  const onSubmit = async (data: ContactForm) => {
    try {
      setIsLoading(true);
      
      const payload = {
        name: data.name,
        phone: data.phone || null,
        notes: data.notes || null,
        opening_balance: parseFloat(data.opening_balance || '0'),
        opening_balance_type: data.opening_balance_type,
      };

      await api.put(`/contacts/${id}`, payload);
      
      // Clear cache so the directory and profile refetch
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contactSummary', Number(id)] });
      
      Alert.alert(
        'Success',
        'Contact updated successfully.',
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
          <Text className="text-white text-xl font-bold">Edit Contact</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <AppCard>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Contact Name"
                  placeholder="e.g. John Doe"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Phone Number (Optional)"
                  placeholder="+1 234 567 8900"
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.phone?.message}
                />
              )}
            />

            <View className="flex-row items-start space-x-3 mb-2">
              <View className="flex-1">
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
              </View>

              <View className="flex-1">
                <Controller
                  control={control}
                  name="opening_balance_type"
                  render={({ field: { value } }) => {
                    const selected = BALANCE_TYPES.find(t => t.id === value);
                    return (
                      <View className="mb-4">
                        <Text className="text-sm text-slate-400 font-medium mb-1.5 ml-1">Type</Text>
                        <TouchableOpacity 
                          className="flex-row items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 h-14"
                          onPress={() => bottomSheetRef.current?.present()}
                        >
                          <Text className="text-white text-sm flex-1" numberOfLines={1}>{selected ? selected.label : 'Select'}</Text>
                          <ChevronDown size={20} color="#94a3b8" />
                        </TouchableOpacity>
                        {errors.opening_balance_type && <Text className="text-red-500 text-sm mt-1">{errors.opening_balance_type.message}</Text>}
                      </View>
                    );
                  }}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="mb-4">
                  <Text className="text-sm text-slate-400 font-medium mb-1.5 ml-1">Notes (Optional)</Text>
                  <View className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 min-h-[100px]">
                    <AppInput
                      label=""
                      placeholder="Add notes..."
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.notes?.message}
                    />
                  </View>
                </View>
              )}
            />

            <View className="mt-2">
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
            <Text className="text-white text-lg font-bold">Balance Type</Text>
          </View>
          <BottomSheetFlatList
            data={BALANCE_TYPES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = watch('opening_balance_type') === item.id;
              return (
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-4 border-b border-slate-800 ${isSelected ? 'bg-primary-900/20' : ''}`}
                  onPress={() => {
                    setValue('opening_balance_type', item.id as any, { shouldValidate: true, shouldDirty: true });
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
