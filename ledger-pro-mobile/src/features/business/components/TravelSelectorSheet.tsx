import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Search, Check } from 'lucide-react-native';

export interface TravelOption {
  label: string;
  value: string;
  subLabel?: string;
}

interface Props {
  options: TravelOption[];
  onSelect: (value: string) => void;
  selectedValue?: string;
  title?: string;
}

export type TravelSelectorSheetRef = BottomSheetModal;

export const TravelSelectorSheet = forwardRef<BottomSheetModal, Props>(({ options, onSelect, selectedValue, title = 'Select' }, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" opacity={0.5} />
    ),
    []
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(o => 
      o.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (o.subLabel && o.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [options, searchQuery]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1e293b' }}
      handleIndicatorStyle={{ backgroundColor: '#475569' }}
      onDismiss={() => setSearchQuery('')}
    >
      <View className="flex-1 pb-6">
        <View className="px-4 pb-4 border-b border-slate-700">
          <Text className="text-white text-lg font-bold mb-4 text-center">{title}</Text>
          
          <View className="flex-row items-center bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-700">
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#64748b"
              className="flex-1 ml-3 text-white text-base"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <BottomSheetFlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center justify-between py-4 border-b border-slate-700/50"
              onPress={() => {
                onSelect(item.value);
              }}
            >
              <View className="flex-1 mr-4">
                <Text className={`text-base font-medium ${selectedValue === item.value ? 'text-primary-500' : 'text-white'}`}>
                  {item.label}
                </Text>
                {item.subLabel && (
                  <Text className="text-slate-400 text-sm mt-0.5">{item.subLabel}</Text>
                )}
              </View>
              {selectedValue === item.value && (
                <View className="w-6 h-6 rounded-full bg-primary-500/20 items-center justify-center">
                  <Check size={14} color="#f97316" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="py-10 items-center">
              <Text className="text-slate-400">No results found</Text>
            </View>
          )}
        />
      </View>
    </BottomSheetModal>
  );
});
