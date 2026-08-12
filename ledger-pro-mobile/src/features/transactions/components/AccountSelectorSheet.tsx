import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Pressable, Platform, FlatList } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Search, Check } from 'lucide-react-native';
import { useAccounts, Account } from '../../accounts/api/accounts';
import * as Haptics from 'expo-haptics';

interface Props {
  type?: string;
  onSelect: (account: Account) => void;
  selectedId?: number;
  title?: string;
}

export type AccountSelectorSheetRef = BottomSheetModal;

export const AccountSelectorSheet = forwardRef<BottomSheetModal, Props>(({ type, onSelect, selectedId, title = 'Select Account' }, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: accounts, isLoading } = useAccounts(type);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" opacity={0.5} />
    ),
    []
  );

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!searchQuery) return accounts;
    return accounts.filter((a: Account) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [accounts, searchQuery]);

  const handleSelect = useCallback((account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(account);
    // @ts-ignore
    ref?.current?.dismiss();
  }, [onSelect, ref]);

  const renderItem = useCallback(({ item }: { item: Account }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        className={`flex-row items-center justify-between p-4 border-b border-border active:bg-border/50 ${isSelected ? 'bg-primary-500/10' : ''}`}
        onPress={() => handleSelect(item)}
      >
        <View>
          <Text className={`text-base font-medium ${isSelected ? 'text-primary-500' : 'text-white'}`}>{item.name}</Text>
          <Text className="text-muted text-xs capitalize mt-1">{item.type.replace(/_/g, ' ')}</Text>
        </View>
        {isSelected && <Check size={20} color="#f97316" />}
      </TouchableOpacity>
    );
  }, [selectedId, handleSelect]);

  const content = (
    <View className="flex-1 px-4 pt-4">
      <Text className="text-white text-lg font-bold mb-4">{title}</Text>
      
      <View className="flex-row items-center bg-slate-800 rounded-xl px-3 h-12 mb-4 border border-slate-700">
        <Search size={20} color="#94a3b8" />
        <TextInput
          className="flex-1 text-white ml-2 text-base"
          placeholder="Search..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Loading...</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item: Account) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      ) : (
        <BottomSheetFlatList
          data={filteredAccounts}
          keyExtractor={(item: Account) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    const [visible, setVisible] = useState(false);

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
          <Pressable className="w-full bg-slate-900 rounded-t-3xl border-t border-slate-700 h-[80%]" onPress={(e) => e.stopPropagation()}>
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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      {content}
    </BottomSheetModal>
  );
});

AccountSelectorSheet.displayName = 'AccountSelectorSheet';
