import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const STORAGE_KEY = 'app_lock_enabled';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

interface LockState {
  /** The user turned the lock on and the device can enforce it. */
  enabled: boolean;
  /** The lock screen is currently covering the app. */
  locked: boolean;
  /** Settings have been read from disk and the hardware checked. */
  hydrated: boolean;
  /** Biometrics exist on this device and at least one is enrolled. */
  available: boolean;
  kind: BiometricKind;
  hydrate: () => Promise<void>;
  /** Turn the lock on (after confirming identity) or off. Resolves false if the user cancelled. */
  setEnabled: (value: boolean) => Promise<boolean>;
  lock: () => void;
  /** Show the system prompt. Resolves true when the user passed. */
  unlock: () => Promise<boolean>;
}

export const useLockStore = create<LockState>((set, get) => ({
  enabled: false,
  locked: false,
  hydrated: false,
  available: false,
  kind: 'none',

  hydrate: async () => {
    let wanted = false;
    try {
      wanted = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
    } catch {
      wanted = false;
    }

    let available = false;
    let kind: BiometricKind = 'none';
    if (Platform.OS !== 'web') {
      try {
        const [hasHardware, enrolled, types] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
        ]);
        available = hasHardware && enrolled;
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) kind = 'face';
        else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) kind = 'fingerprint';
        else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) kind = 'iris';
      } catch {
        available = false;
      }
    }

    // If biometrics were removed from the device, never lock the user out.
    const enabled = wanted && available;
    set({ enabled, available, kind, hydrated: true, locked: enabled });
  },

  setEnabled: async (value) => {
    if (value) {
      const passed = await get().unlock();
      if (!passed) return false;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Preference simply won't survive a restart.
    }
    set({ enabled: value, locked: false });
    return true;
  },

  lock: () => {
    if (get().enabled) set({ locked: true });
  },

  unlock: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Ledger Pro',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        set({ locked: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
