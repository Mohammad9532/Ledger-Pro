import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, SafeAreaView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, User, Lock, Building, LogOut, ChevronRight,
  Eye, EyeOff, CheckCircle, Terminal,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/api';
import { LinearGradient } from 'expo-linear-gradient';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 24, marginLeft: 4 }}>
      {title}
    </Text>
  );
}

function SettingRow({ icon: Icon, label, value, onPress, destructive = false, trailing }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: destructive ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon size={17} color={destructive ? '#ef4444' : '#f97316'} />
      </View>
      <Text style={{ flex: 1, color: destructive ? '#ef4444' : '#f8fafc', fontWeight: '600', fontSize: 15 }}>{label}</Text>
      {value && <Text style={{ color: '#64748b', fontSize: 13, marginRight: 6 }}>{value}</Text>}
      {trailing || <ChevronRight size={16} color="#334155" />}
    </TouchableOpacity>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 4 }}>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#0f172a', marginLeft: 62 }} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, company, setAuth, logout } = useAuthStore();

  // Personal Info
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState((user as any)?.phone ?? '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);

  // Company
  const [companyName, setCompanyName] = useState(company?.company_name ?? '');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [savingCompany, setSavingCompany] = useState(false);
  const [showCompany, setShowCompany] = useState(false);

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api.get('/company/profile').then(res => {
      const p = res.data.profile;
      if (p?.currency_code) setCurrencyCode(p.currency_code);
      if (res.data.company_name) setCompanyName(res.data.company_name);
    }).catch(() => {});
  }, []);

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      await api.put('/profile', { name, phone });
      // Update the auth store with fresh user data
      const { token, tenant } = useAuthStore.getState();
      await setAuth(token!, { ...user!, name, ...(phone ? { phone } : {}) }, company, tenant);
      Alert.alert('Success', 'Profile updated successfully!');
      setShowPersonal(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await api.post('/company/profile', { company_name: companyName, currency_code: currencyCode, _method: 'PUT' });
      Alert.alert('Success', 'Company settings updated!');
      setShowCompany(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update company');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (newPwd.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setSavingPwd(true);
    try {
      await api.put('/profile/password', { current_password: currentPwd, new_password: newPwd, new_password_confirmation: confirmPwd });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowPassword(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login' as any); } },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'LP';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      <SafeAreaView>
        <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          {/* Avatar + name */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>{initials}</Text>
            </LinearGradient>
            <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>{user?.name}</Text>
            <Text style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{user?.email}</Text>
            <View style={{ backgroundColor: 'rgba(249,115,22,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 }}>
              <Text style={{ color: '#f97316', fontSize: 11, fontWeight: '700' }}>{company?.company_name}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Personal Info */}
        <SectionHeader title="Personal Information" />
        <SettingsCard>
          <SettingRow icon={User} label="Edit Profile" value={user?.name} onPress={() => setShowPersonal(v => !v)} />
          {showPersonal && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 6 }}>Full Name</Text>
              <View style={{ backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 }}>
                <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#475569" style={{ color: '#f8fafc', fontSize: 15 }} />
              </View>
              <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Phone (Optional)</Text>
              <View style={{ backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 }}>
                <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#475569" keyboardType="phone-pad" style={{ color: '#f8fafc', fontSize: 15 }} />
              </View>
              <TouchableOpacity onPress={handleSaveInfo} disabled={savingInfo}
                style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                {savingInfo ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </SettingsCard>

        {/* Company Settings */}
        <SectionHeader title="Business" />
        <SettingsCard>
          <SettingRow icon={Building} label="Company Settings" value={company?.company_name} onPress={() => setShowCompany(v => !v)} />
          {showCompany && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 6 }}>Company Name</Text>
              <View style={{ backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 }}>
                <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Company name" placeholderTextColor="#475569" style={{ color: '#f8fafc', fontSize: 15 }} />
              </View>
              <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Currency Code</Text>
              <View style={{ backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 }}>
                <TextInput value={currencyCode} onChangeText={setCurrencyCode} placeholder="INR" placeholderTextColor="#475569" maxLength={3} autoCapitalize="characters" style={{ color: '#f8fafc', fontSize: 15 }} />
              </View>
              <TouchableOpacity onPress={handleSaveCompany} disabled={savingCompany}
                style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                {savingCompany ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save Company</Text>}
              </TouchableOpacity>
            </View>
          )}
        </SettingsCard>

        {/* Security */}
        <SectionHeader title="Security" />
        <SettingsCard>
          <SettingRow icon={Lock} label="Change Password" onPress={() => setShowPassword(v => !v)} />
          {showPassword && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
              {[
                { label: 'Current Password', value: currentPwd, onChange: setCurrentPwd },
                { label: 'New Password', value: newPwd, onChange: setNewPwd },
                { label: 'Confirm New Password', value: confirmPwd, onChange: setConfirmPwd },
              ].map((field, i) => (
                <View key={i}>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 6 }}>{field.label}</Text>
                  <View style={{ backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 4 }}>
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      secureTextEntry={!showPwd}
                      placeholder="••••••••"
                      placeholderTextColor="#475569"
                      style={{ flex: 1, color: '#f8fafc', fontSize: 15 }}
                    />
                    {i === 0 && (
                      <TouchableOpacity onPress={() => setShowPwd(v => !v)}>
                        {showPwd ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity onPress={handleChangePassword} disabled={savingPwd}
                style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 }}>
                {savingPwd ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Change Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </SettingsCard>

        {/* Developer */}
        <SectionHeader title="Developer" />
        <SettingsCard>
          <SettingRow icon={Terminal} label="Developer Mode" onPress={() => router.push('/settings/developer' as any)} />
        </SettingsCard>

        {/* Sign out */}
        <SectionHeader title="Account" />
        <SettingsCard>
          <SettingRow icon={LogOut} label="Sign Out" destructive onPress={handleLogout} trailing={<View />} />
        </SettingsCard>

        <Text style={{ color: '#1e293b', textAlign: 'center', fontSize: 12, marginTop: 24 }}>Ledger Pro Mobile v0.4.0</Text>
      </ScrollView>
    </View>
  );
}
