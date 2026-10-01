import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { BrandMark } from '../../components/BrandMark';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, text } from '../../theme';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      const response = await api.post('/login', { ...data, device_name: 'mobile' });

      const { token, user, company, tenant } = response.data;
      await setAuth(token, user, company, tenant);
      // Navigation is automatically handled by the root _layout based on token presence
    } catch (error: any) {
      const res = error.response;
      if (res?.status === 403 && res.data?.code === 'EMAIL_NOT_VERIFIED') {
        // The server has just sent a fresh code; go straight to the code screen.
        const target = res.data.email ?? data.email;
        Alert.alert('Verify your email', res.data.message, [
          { text: 'Enter code', onPress: () => router.push(`/(auth)/verify-email?email=${encodeURIComponent(target)}`) },
        ]);
        return;
      }
      Alert.alert(
        'Login Failed',
        res?.data?.message || 'Please check your credentials and try again.'
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand + headline */}
        <View className="mb-8">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <BrandMark size={38} />
            <Text style={{ fontFamily: fonts.displayItalic, fontSize: 24, color: colors.ink }}>Ledger Pro</Text>
          </View>
          <Text style={text.eyebrow}>Welcome back</Text>
          <Text style={[text.title, { fontSize: 38, lineHeight: 42, marginTop: 8 }]}>
            Every entry,{'\n'}
            <Text style={{ fontFamily: fonts.displayItalic, color: colors.primary }}>balanced.</Text>
          </Text>
          <Text style={[text.bodyMuted, { marginTop: 12, fontSize: 14.5, lineHeight: 21 }]}>
            Sign in to manage your accounting and business operations.
          </Text>
        </View>

        <AppCard ruled>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email address"
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                trailing={
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} color={colors.inkFaint} /> : <Eye size={18} color={colors.inkFaint} />}
                  </TouchableOpacity>
                }
              />
            )}
          />

          <View className="mt-2">
            <AppButton
              title="Sign in"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
            />
          </View>

          <View className="flex-row justify-between items-center mt-5">
            <AppButton
              title="Forgot password?"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/forgot-password')}
            />
            <AppButton
              title="Create account"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </AppCard>

        <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.inkGhost, textAlign: 'center', marginTop: 28, letterSpacing: 1 }}>
          DOUBLE-ENTRY · MULTI-CURRENCY
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
