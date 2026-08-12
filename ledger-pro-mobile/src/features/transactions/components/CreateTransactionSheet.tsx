import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Platform, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, BookOpen, FileText, Plane } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export type CreateTransactionSheetRef = BottomSheetModal;

export const CreateTransactionSheet = forwardRef<BottomSheetModal>((props, ref) => {
  const router = useRouter();
  const snapPoints = useMemo(() => ['50%', '60%'], []);

  const handleAction = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // @ts-ignore
    ref?.current?.dismiss();
    router.push(route as any);
  }, [router, ref]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    []
  );

  const actions = [
    { id: 'income', label: 'Income', icon: <ArrowDownLeft size={24} color="#10b981" />, route: '/transactions/new?type=income' },
    { id: 'expense', label: 'Expense', icon: <ArrowUpRight size={24} color="#ef4444" />, route: '/transactions/new?type=expense' },
    { id: 'transfer', label: 'Transfer', icon: <RefreshCw size={24} color="#3b82f6" />, route: '/transactions/new?type=transfer' },
    { id: 'journal', label: 'Journal', icon: <BookOpen size={24} color="#8b5cf6" />, route: '/transactions/new?type=journal' },
    { id: 'invoice', label: 'Invoice', icon: <FileText size={24} color="#f59e0b" />, route: '/(tabs)' }, // Future
    { id: 'flight', label: 'Flight Ticket', icon: <Plane size={24} color="#06b6d4" />, route: '/(tabs)' }, // Future
  ];

  const content = (
    <View className="flex-1 p-6">
      <Text className="text-white text-xl font-bold mb-6">Create New</Text>
      
      <View className="flex-row flex-wrap justify-between">
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            className="w-[30%] items-center mb-6"
            onPress={() => handleAction(action.route)}
            activeOpacity={0.7}
          >
            <View className="w-16 h-16 rounded-2xl bg-slate-800/50 items-center justify-center mb-2 border border-slate-700/50">
              {action.icon}
            </View>
            <Text className="text-slate-300 text-xs font-medium text-center">{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    // Basic Web Fallback
    const [visible, setVisible] = React.useState(false);

    // Expose a pseudo-ref for web to mimic bottom sheet API
    React.useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => setVisible(false),
      close: () => setVisible(false),
      collapse: () => {},
      expand: () => {},
      forceClose: () => setVisible(false),
      snapToIndex: () => {},
      snapToPosition: () => {}
    } as any));

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setVisible(false)}>
          <Pressable className="w-full bg-slate-900 rounded-t-3xl border-t border-slate-700 h-2/3" onPress={(e) => e.stopPropagation()}>
            <View className="w-12 h-1.5 bg-slate-600 rounded-full self-center mt-4 mb-2" />
            {content}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1e293b' }}
      handleIndicatorStyle={{ backgroundColor: '#64748b' }}
    >
      {content}
    </BottomSheetModal>
  );
});

CreateTransactionSheet.displayName = 'CreateTransactionSheet';
