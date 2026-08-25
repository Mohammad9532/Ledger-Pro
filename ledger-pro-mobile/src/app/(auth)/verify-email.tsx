import React, { useState, useEffect } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import api from '../../api/api';

const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be exactly 6 digits'),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'Missing email address.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [email, router]);

  const onSubmit = async (data: VerifyForm) => {
    try {
      setIsLoading(true);
      await api.post('/verify-email', {
        email: email,
        code: data.code
      });
      
      Alert.alert(
        'Email Verified',
        'Your account has been successfully verified! You can now log in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || 'Invalid or expired verification code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      setIsResending(true);
      await api.post('/verify-email/resend', { email: email });
      setCountdown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert(
        'Request Failed',
        error.response?.data?.message || 'Could not resend code. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-white mb-2">Verify Email</Text>
          <Text className="text-base text-muted text-center">
            We sent a 6-digit verification code to
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
                label="Verification Code"
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

          <View className="mt-6 items-center">
            <Text className="text-muted mb-2">Didn't receive the code?</Text>
            <TouchableOpacity 
              onPress={handleResend} 
              disabled={isResending || countdown > 0}
              className="py-2 px-4"
            >
              <Text className={`font-bold ${countdown > 0 ? 'text-slate-500' : 'text-primary-500'}`}>
                {isResending ? 'Sending...' : countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
