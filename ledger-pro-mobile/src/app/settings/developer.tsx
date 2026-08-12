import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Terminal, Server, Database, Activity, Smartphone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';

export default function DeveloperDiagnosticsScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  const queryCache = queryClient.getQueryCache();
  const mutationCache = queryClient.getMutationCache();

  const renderDiagnosticRow = (label: string, value: string | number | undefined, Icon: any) => (
    <View className="flex-row items-center justify-between p-4 border-b border-border">
      <View className="flex-row items-center">
        <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center mr-3">
          <Icon size={16} color="#94a3b8" />
        </View>
        <Text className="text-white font-medium">{label}</Text>
      </View>
      <Text className="text-muted text-sm max-w-[50%]" numberOfLines={1} ellipsizeMode="tail">
        {value || 'N/A'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-4 bg-card border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Developer Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20 mb-6 flex-row items-center">
          <Terminal size={24} color="#f97316" className="mr-3" />
          <View className="flex-1">
            <Text className="text-primary-500 font-bold mb-1">Alpha Diagnostics</Text>
            <Text className="text-primary-400 text-xs">
              This screen is restricted to developer builds and testers.
            </Text>
          </View>
        </View>

        <Text className="text-white font-bold mb-2 ml-2">Environment</Text>
        <View className="bg-card rounded-2xl border border-border mb-6 overflow-hidden">
          {renderDiagnosticRow('API URL', process.env.EXPO_PUBLIC_API_URL, Server)}
          {renderDiagnosticRow('Tenant DB', (user as any)?.company?.database_name || 'master', Database)}
          {renderDiagnosticRow('App Version', '0.4.0-alpha', Terminal)}
          {renderDiagnosticRow('Build Number', '40', Terminal)}
        </View>

        <Text className="text-white font-bold mb-2 ml-2">React Query Cache</Text>
        <View className="bg-card rounded-2xl border border-border mb-6 overflow-hidden">
          {renderDiagnosticRow('Query Cache Size', queryCache.getAll().length, Activity)}
          {renderDiagnosticRow('Pending Mutations', mutationCache.getAll().filter(m => m.state.status === 'pending').length, Activity)}
          {renderDiagnosticRow('Last Sync', new Date().toLocaleTimeString(), Activity)}
        </View>

        <Text className="text-white font-bold mb-2 ml-2">Device Info</Text>
        <View className="bg-card rounded-2xl border border-border mb-6 overflow-hidden">
          {renderDiagnosticRow('OS', Platform.OS, Smartphone)}
          {renderDiagnosticRow('OS Version', Platform.Version.toString(), Smartphone)}
          {renderDiagnosticRow('Expo Version', Constants.expoVersion || 'N/A', Smartphone)}
        </View>

        <TouchableOpacity 
          className="bg-danger/10 border border-danger/20 rounded-xl py-3 items-center mb-8"
          onPress={() => {
            queryClient.clear();
            // Optional: clear AsyncStorage here if needed for hard reset
            alert('Cache Cleared');
          }}
        >
          <Text className="text-danger font-bold">Clear All Cache</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
