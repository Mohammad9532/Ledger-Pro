import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import api from '../../api/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      await api.post('/password/forgot', data);
      
      Alert.alert(
        'Email Sent',
        'If an account with that email exists, we have sent a password reset link.',
        [{ text: 'OK', onPress: () => router.replace(`/(auth)/verify-forgot?email=${encodeURIComponent(data.email)}`) }]
      );
    } catch (error: any) {
      Alert.alert(
        'Request Failed',
        error.response?.data?.message || 'An error occurred while requesting a password reset.'
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
        <View className="mb-10">
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7C948C', marginBottom: 8 }}>Account recovery</Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 36, lineHeight: 40, color: '#E7F0EB', letterSpacing: -0.4, marginBottom: 8 }}>Reset your password</Text>
          <Text className="text-base text-muted">
            Enter your email address to receive a password reset link.
          </Text>
        </View>

        <AppCard>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email Address"
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <View className="mt-4">
            <AppButton
              title="Send Reset Link"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
            />
          </View>

          <View className="items-center mt-6">
            <AppButton
              title="Back to Sign In"
              variant="ghost"
              size="sm"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
            />
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
