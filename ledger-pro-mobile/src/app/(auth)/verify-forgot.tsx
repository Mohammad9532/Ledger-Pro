import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import api from '../../api/api';

const verifyForgotSchema = z.object({
  code: z.string().length(6, 'Verification code must be exactly 6 digits'),
});

type VerifyForgotForm = z.infer<typeof verifyForgotSchema>;

export default function VerifyForgotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForgotForm>({
    resolver: zodResolver(verifyForgotSchema),
  });

  if (!email) {
    Alert.alert('Error', 'Missing email address.', [
      { text: 'OK', onPress: () => router.replace('/login') }
    ]);
    return null;
  }

  const onSubmit = async (data: VerifyForgotForm) => {
    try {
      setIsLoading(true);
      await api.post('/password/verify-otp', {
        email: email,
        code: data.code
      });
      
      router.replace(`/(auth)/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || 'Invalid or expired verification code.'
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
          <Text className="text-3xl font-bold text-white mb-2">Verify Reset Code</Text>
          <Text className="text-base text-muted text-center">
            We sent a 6-digit password reset code to
          </Text>
          <Text className="text-base text-primary-400 font-bold mt-1">
            {email}
          </Text>
        </View>

        <AppCard>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Reset Code"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.code?.message}
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
              />
            )}
          />

          <View className="mt-6">
            <AppButton
              title="Verify Code"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
            />
          </View>
          
          <View className="items-center mt-6">
            <AppButton
              title="Back to Sign In"
              variant="ghost"
              size="sm"
              onPress={() => router.replace('/login')}
            />
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
