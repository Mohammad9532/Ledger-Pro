import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Search } from 'lucide-react-native';
import { AccountList } from '../../features/accounts/components/AccountList';
import { ContactList } from '../../features/accounts/components/ContactList';
import { useUiStore } from '../../store/uiStore';

export default function AccountsDirectoryScreen() {
  const { activeDirectoryTab, setActiveDirectoryTab } = useUiStore();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header & Search */}
      <View className="px-4 pt-4 pb-2 bg-card">
        <Text className="text-white text-2xl font-bold mb-4">Directory</Text>
        
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 h-12 mb-4 border border-slate-700">
          <Search size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 text-white ml-2 text-base"
            placeholder="Search directory..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Control */}
        <View className="flex-row bg-slate-800 p-1 rounded-xl">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeDirectoryTab === 'accounts' ? 'bg-primary-500' : ''}`}
            onPress={() => setActiveDirectoryTab('accounts')}
          >
            <Text className={`font-bold ${activeDirectoryTab === 'accounts' ? 'text-white' : 'text-slate-400'}`}>
              Accounts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeDirectoryTab === 'contacts' ? 'bg-primary-500' : ''}`}
            onPress={() => setActiveDirectoryTab('contacts')}
          >
            <Text className={`font-bold ${activeDirectoryTab === 'contacts' ? 'text-white' : 'text-slate-400'}`}>
              Contacts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">
        {activeDirectoryTab === 'accounts' ? (
          <AccountList searchQuery={searchQuery} />
        ) : (
          <ContactList searchQuery={searchQuery} />
        )}
      </View>
    </SafeAreaView>
  );
}
