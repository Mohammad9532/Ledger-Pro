import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { queryClient } from '../_layout';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ChevronDown, Check } from 'lucide-react-native';

const onboardingSchema = z.object({
  country_code: z.string().length(2, 'Country Code must be exactly 2 letters (e.g. US)').toUpperCase(),
  currency_code: z.string().length(3, 'Currency Code must be exactly 3 letters (e.g. USD)').toUpperCase(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SA', name: 'Saudi Arabia' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'PKR', name: 'Pakistani Rupee (Rs)' },
  { code: 'AED', name: 'UAE Dirham (د.إ)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'SAR', name: 'Saudi Riyal (SR)' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const [activePicker, setActivePicker] = useState<'country' | 'currency' | null>(null);


  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      country_code: 'US',
      currency_code: 'USD',
    }
  });

  const onSubmit = async (data: OnboardingForm) => {
    try {
      setIsLoading(true);
      
      const payload = {
        company_name: company?.company_name || 'My Company',
        country_code: data.country_code,
        currency_code: data.currency_code,
        timezone: 'UTC',
        financial_year_start: '01-01',
        financial_year_end: '12-31',
        tax_enabled: false,
      };

      await api.put('/company/profile', payload);
      
      // Clear cache so the dashboard re-fetches cleanly
      queryClient.clear();
      
      Alert.alert(
        'Setup Complete',
        'Your company ledger is now ready!',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Setup Failed',
        error.response?.data?.message || 'An error occurred while saving your company profile.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-white mb-2">Company Setup</Text>
          <Text className="text-base text-muted text-center">
            Just a few more details to set up your ledger.
          </Text>
        </View>

        <AppCard>
          <Controller
            control={control}
            name="country_code"
            render={({ field: { value } }) => {
              const selected = COUNTRIES.find(c => c.code === value);
              return (
                <View className="mb-4">
                  <Text className="text-sm text-slate-400 font-medium mb-1.5 ml-1">Country</Text>
                  <TouchableOpacity 
                    className="flex-row items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 h-14"
                    onPress={() => {
                      setActivePicker('country');
                      bottomSheetRef.current?.present();
                    }}
                  >
                    <Text className="text-white text-base">{selected ? selected.name : 'Select Country'}</Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {errors.country_code && <Text className="text-red-500 text-sm mt-1">{errors.country_code.message}</Text>}
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="currency_code"
            render={({ field: { value } }) => {
              const selected = CURRENCIES.find(c => c.code === value);
              return (
                <View className="mb-4">
                  <Text className="text-sm text-slate-400 font-medium mb-1.5 ml-1">Currency</Text>
                  <TouchableOpacity 
                    className="flex-row items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 h-14"
                    onPress={() => {
                      setActivePicker('currency');
                      bottomSheetRef.current?.present();
                    }}
                  >
                    <Text className="text-white text-base">{selected ? selected.name : 'Select Currency'}</Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {errors.currency_code && <Text className="text-red-500 text-sm mt-1">{errors.currency_code.message}</Text>}
                </View>
              );
            }}
          />
          
          <View className="mt-2 mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <Text className="text-slate-400 text-sm">
              Note: You can configure detailed Tax Settings and Financial Year dates from the Settings menu later.
            </Text>
          </View>

          <View className="mt-4">
            <AppButton
              title="Complete Setup"
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
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
      >
        <View className="px-4 pb-2 border-b border-slate-700">
          <Text className="text-white text-lg font-bold">
            Select {activePicker === 'country' ? 'Country' : 'Currency'}
          </Text>
        </View>
        <BottomSheetFlatList
          data={activePicker === 'country' ? COUNTRIES : CURRENCIES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => {
            const isSelected = activePicker === 'country' 
              ? watch('country_code') === item.code 
              : watch('currency_code') === item.code;
              
            return (
              <TouchableOpacity
                className={`flex-row items-center justify-between p-4 border-b border-slate-800 ${isSelected ? 'bg-primary-900/20' : ''}`}
                onPress={() => {
                  if (activePicker === 'country') {
                    setValue('country_code', item.code, { shouldValidate: true, shouldDirty: true });
                  } else {
                    setValue('currency_code', item.code, { shouldValidate: true, shouldDirty: true });
                  }
                  bottomSheetRef.current?.dismiss();
                }}
              >
                <Text className={`text-base ${isSelected ? 'text-primary-500 font-bold' : 'text-slate-200'}`}>
                  {item.name}
                </Text>
                {isSelected && <Check size={20} color="#f97316" />}
              </TouchableOpacity>
            );
          }}
        />
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}
