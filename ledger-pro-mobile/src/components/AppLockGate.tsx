import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import { useLockStore, BiometricKind } from '../store/lockStore';
import { useAuthStore } from '../store/authStore';
import { BrandMark } from './BrandMark';
import { colors, fonts } from '../theme';

/** Time in the background after which the app locks again. */
const RELOCK_AFTER_MS = 30 * 1000;

function LockScreen({ kind, onUnlock }: { kind: BiometricKind; onUnlock: () => void }) {
  const Icon = kind === 'face' ? ScanFace : Fingerprint;
  const verb = kind === 'face' ? 'Unlock with face' : kind === 'fingerprint' ? 'Unlock with fingerprint' : 'Unlock';
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 1000, elevation: 1000 }]}>
      <BrandMark size={64} />
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginTop: 26, letterSpacing: -0.4 }}>Ledger Pro is locked</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
        Confirm it's you to open your ledger.
      </Text>
      <TouchableOpacity
        onPress={onUnlock}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={verb}
        style={{
          marginTop: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.primary,
          paddingHorizontal: 22,
          paddingVertical: 14,
          borderRadius: 14,
        }}
      >
        <Icon size={20} color={colors.onPrimary} strokeWidth={2.2} />
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.onPrimary }}>{verb}</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Covers the app with a biometric lock screen when the lock is enabled:
 * on cold start, and whenever the app has been in the background for a while.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { enabled, locked, hydrated, kind, hydrate, lock, unlock } = useLockStore();
  const token = useAuthStore((s) => s.token);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        return;
      }
      if (status === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (away >= RELOCK_AFTER_MS) lock();
      }
    });
    return () => subscription.remove();
  }, [lock]);

  const signedIn = !!token;
  const showLock = hydrated && enabled && locked && signedIn;

  // Ask for the biometric as soon as the lock screen appears; the button is the retry.
  useEffect(() => {
    if (!showLock || prompting.current) return;
    prompting.current = true;
    unlock().finally(() => {
      prompting.current = false;
    });
  }, [showLock, unlock]);

  return (
    <>
      {children}
      {/* Until settings are read, keep a signed-in user's data covered so nothing flashes before the lock. */}
      {!hydrated && signedIn && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 1000, elevation: 1000 }]} />}
      {showLock && <LockScreen kind={kind} onUnlock={() => { if (!prompting.current) { prompting.current = true; unlock().finally(() => { prompting.current = false; }); } }} />}
    </>
  );
}
