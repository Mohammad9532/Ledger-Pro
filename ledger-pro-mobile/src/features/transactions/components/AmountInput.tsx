import React, { useRef } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';

interface Props {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
}

export const AmountInput = ({ value, onChange, currency = '₹' }: Props) => {
  const inputRef = useRef<TextInput>(null);

  const handleTextChange = (text: string) => {
    // Only allow numbers and one decimal point
    const filtered = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    onChange(filtered);
  };

  return (
    <View className="items-center justify-center py-10">
      <Text className="text-muted text-sm font-medium mb-4">Amount</Text>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => inputRef.current?.focus()}
        className="flex-row items-center justify-center"
      >
        <Text className="text-primary-500 text-5xl font-bold mr-2">{currency}</Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleTextChange}
          keyboardType="decimal-pad"
          className="text-white text-6xl font-bold p-0 m-0 w-auto min-w-[100px]"
          placeholder="0.00"
          placeholderTextColor="#334155"
          autoFocus
        />
      </TouchableOpacity>
    </View>
  );
};
