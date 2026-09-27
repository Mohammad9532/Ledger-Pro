import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AccountList } from '../../features/accounts/components/AccountList';
import { ContactList } from '../../features/accounts/components/ContactList';
import { useUiStore } from '../../store/uiStore';
import { colors, fonts, text, shadow } from '../../theme';

type DirectoryTab = 'accounts' | 'contacts';

export default function AccountsDirectoryScreen() {
  const router = useRouter();
  const { activeDirectoryTab, setActiveDirectoryTab } = useUiStore();
  const [searchQuery, setSearchQuery] = useState('');

  const Segment = ({ id, label }: { id: DirectoryTab; label: string }) => {
    const active = activeDirectoryTab === id;
    return (
      <TouchableOpacity
        onPress={() => setActiveDirectoryTab(id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={{
          flex: 1,
          paddingVertical: 9,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: active ? colors.primary : 'transparent',
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: active ? colors.onPrimary : colors.inkMuted }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header & Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={text.eyebrow}>Chart of accounts · People</Text>
        <Text style={[text.title, { marginTop: 4, marginBottom: 16 }]}>Directory</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.bg,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 46,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={18} color={colors.inkFaint} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontFamily: fonts.sans, fontSize: 15, color: colors.ink }}
            placeholder="Search directory…"
            placeholderTextColor={colors.inkGhost}
            selectionColor={colors.primary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Segmented control */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.bg, padding: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
          <Segment id="accounts" label="Accounts" />
          <Segment id="contacts" label="Contacts" />
        </View>
      </View>

      <View className="flex-1">
        {activeDirectoryTab === 'accounts' ? (
          <AccountList searchQuery={searchQuery} />
        ) : (
          <ContactList searchQuery={searchQuery} />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadow.glow,
        }}
        onPress={() => {
          if (activeDirectoryTab === 'accounts') {
            router.push('/accounts/new');
          } else {
            router.push('/contacts/new');
          }
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={activeDirectoryTab === 'accounts' ? 'New account' : 'New contact'}
      >
        <Plus size={24} color={colors.onPrimary} strokeWidth={2.4} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
