import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager, onlineManager, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

/**
 * Offline level 1: every query result is kept on disk, screens open from the
 * last known data, and queries refetch as soon as connectivity or focus returns.
 * Writes still need a connection (there is no outbox yet).
 */

/** How long a saved result stays usable while offline. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show the cached result first; a fetch that fails while offline pauses instead of erroring.
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60,
      // Must be at least CACHE_MAX_AGE, otherwise restored queries are garbage-collected at once.
      gcTime: CACHE_MAX_AGE,
      retry: (failureCount) => onlineManager.isOnline() && failureCount < 2,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'online',
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ledger-pro-query-cache',
  throttleTime: 1000,
});

export const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE,
  // A new app version starts from an empty cache so shape changes never surface stale data.
  buster: Constants.expoConfig?.version ?? '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => query.state.status === 'success',
  },
};

/** Forget everything in memory and on disk. Used on logout so tenants never bleed into each other. */
export async function clearPersistedCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}

// Tell TanStack Query when the device is actually online, so it pauses
// fetches while offline and refetches everything stale on reconnect.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  });
});

/** Refetch stale queries when the app comes back to the foreground. Returns an unsubscribe. */
export function setupFocusManager(): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}

/** Live connectivity flag for UI, derived from the same source the query client uses. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}
