import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Shield, Bell, HelpCircle, LogOut, ChevronRight, Terminal, Clock } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/api';

// Generates 0-padded strings for hour (0-23) and minute (0-59)
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function TimePickerInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(':');
  const hh = parts[0] || '08';
  const mm = parts[1] || '00';

  const renderItem = (item: string, selected: boolean, onSelect: () => void) => (
    <TouchableOpacity
      key={item}
      onPress={onSelect}
      style={{
        paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8,
        backgroundColor: selected ? '#f97316' : 'transparent',
        alignItems: 'center', marginVertical: 2,
      }}
    >
      <Text style={{ color: selected ? '#fff' : '#94a3b8', fontWeight: selected ? '700' : '400', fontSize: 17 }}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginTop: 8, marginBottom: 16 }}>
      {/* Hour column */}
      <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#1e293b' }}>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>Hour</Text>
        <ScrollView style={{ maxHeight: 170 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
            {HOURS.map(h => renderItem(h, h === hh, () => onChange(`${h}:${mm}`)))}
          </View>
        </ScrollView>
      </View>
      {/* Minute column */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>Minute</Text>
        <ScrollView style={{ maxHeight: 170 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
            {MINUTES.map(m => renderItem(m, m === mm, () => onChange(`${hh}:${m}`)))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user   = useAuthStore(state => state.user);
  const [devClicks, setDevClicks] = useState(0);

  // Cheque Reminder Time
  const [reminderTime, setReminderTime]       = useState('08:00');
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [savingReminder, setSavingReminder]   = useState(false);
  const [loadingProfile, setLoadingProfile]   = useState(true);

  useEffect(() => {
    api.get('/company/profile').then(res => {
      const p = res.data.profile;
      if (p?.cheque_reminder_time) setReminderTime(p.cheque_reminder_time);
    }).catch(() => {}).finally(() => setLoadingProfile(false));
  }, []);

  const handleVersionTap = () => {
    const newClicks = devClicks + 1;
    setDevClicks(newClicks);
    if (newClicks >= 5) {
      setDevClicks(0);
      router.push('/settings/developer');
    }
  };

  const handleSaveReminderTime = async () => {
    setSavingReminder(true);
    try {
      await api.post('/company/profile', { cheque_reminder_time: reminderTime, _method: 'PUT' });
      Alert.alert('✅ Saved', `Cheque reminders will be sent daily at ${reminderTime}`);
      setShowTimePicker(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save reminder time');
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800', marginBottom: 20 }}>Settings</Text>

        {/* Profile Card */}
        <View style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, backgroundColor: '#0f172a', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ color: '#f97316', fontSize: 22, fontWeight: '800' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#f8fafc', fontSize: 17, fontWeight: '700' }}>{user?.name || 'User'}</Text>
            <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
          Notifications
        </Text>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 24 }}>
          
          {/* Cheque Reminder Time Row */}
          <TouchableOpacity
            onPress={() => setShowTimePicker(v => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Clock size={18} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 15 }}>Cheque Reminder Time</Text>
              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Daily email alert for pending cheques</Text>
            </View>
            {loadingProfile
              ? <ActivityIndicator size="small" color="#64748b" />
              : <View style={{ backgroundColor: 'rgba(249,115,22,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 }}>
                  <Text style={{ color: '#f97316', fontWeight: '700', fontSize: 14 }}>{reminderTime}</Text>
                </View>
            }
            <ChevronRight size={16} color="#334155" style={{ transform: [{ rotate: showTimePicker ? '90deg' : '0deg' }] }} />
          </TouchableOpacity>

          {/* Expanded Time Picker */}
          {showTimePicker && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
              <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12, marginBottom: 4 }}>
                Select time (24-hour format, in your company's timezone)
              </Text>
              <TimePickerInline value={reminderTime} onChange={setReminderTime} />
              <View style={{ backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
                <Bell size={13} color="#f97316" />
                <Text style={{ color: '#f97316', fontSize: 12, flex: 1, marginLeft: 8 }}>
                  Emails will be sent at <Text style={{ fontWeight: '700' }}>{reminderTime}</Text> for cheques due in the next 5 days.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSaveReminderTime}
                disabled={savingReminder}
                style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
              >
                {savingReminder
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save Reminder Time</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Section */}
        <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
          Account
        </Text>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <User size={18} color="#f97316" />
            </View>
            <Text style={{ flex: 1, color: '#f8fafc', fontWeight: '600', fontSize: 15 }}>Profile & Company Settings</Text>
            <ChevronRight size={16} color="#334155" />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: '#0f172a', marginLeft: 64 }} />
          <TouchableOpacity
            onPress={() => {}}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Shield size={18} color="#f97316" />
            </View>
            <Text style={{ flex: 1, color: '#f8fafc', fontWeight: '600', fontSize: 15 }}>Security & Privacy</Text>
            <ChevronRight size={16} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 15, marginLeft: 10 }}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={{ alignItems: 'center' }}>
          <Text style={{ color: '#1e293b', fontSize: 12 }}>Ledger-Pro Mobile</Text>
          <Text style={{ color: '#1e293b', fontSize: 12, marginTop: 2 }}>v0.4.0-alpha</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
