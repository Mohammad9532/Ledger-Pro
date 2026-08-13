import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Download, Plus, Trash2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

import { useGenerateDocument, useBusinessItems } from '../../features/business/api/business';
import { TravelSelectorSheet } from '../../features/business/components/TravelSelectorSheet';
import { AIRLINES, AIRPORTS } from '../../utils/travelData';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GenerateDocumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: listData } = useBusinessItems();
  const item = listData?.data?.find(i => i.id.toString() === id);

  // Initialize with existing metadata if available
  const existingDoc = item?.metadata?.document_type === 'flight' ? item.metadata : null;

  const [docForm, setDocForm] = useState({
    document_type: 'flight',
    passengers: existingDoc?.passengers || [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
    flight: { 
      airline: existingDoc?.flight?.airline || '', 
      flight_number: existingDoc?.flight?.flight_number || '', 
      pnr: existingDoc?.flight?.pnr || '', 
      ticket_number: existingDoc?.flight?.ticket_number || '', 
      class: existingDoc?.flight?.class || 'Economy', 
      seat: existingDoc?.flight?.seat || '', 
      baggage: existingDoc?.flight?.baggage || '30 Kg', 
      cabin_baggage: existingDoc?.flight?.cabin_baggage || '7 Kg', 
      status: existingDoc?.flight?.status || 'Confirmed', 
      booking_agent: existingDoc?.flight?.booking_agent || '', 
      fare: existingDoc?.flight?.fare || '' 
    },
    journey: { 
      from: existingDoc?.journey?.from || '', 
      to: existingDoc?.journey?.to || '', 
      departure: existingDoc?.journey?.departure || '', 
      arrival: existingDoc?.journey?.arrival || '', 
      terminal: existingDoc?.journey?.terminal || '', 
      gate: existingDoc?.journey?.gate || '', 
      booking_date: existingDoc?.journey?.booking_date || format(new Date(), 'yyyy-MM-dd') 
    }
  });

  const airlineSheetRef = React.useRef<BottomSheetModal>(null);
  const fromSheetRef = React.useRef<BottomSheetModal>(null);
  const toSheetRef = React.useRef<BottomSheetModal>(null);

  const airportOptions = React.useMemo(() => AIRPORTS.map(a => ({
    label: `${a.name} (${a.iata})`,
    value: `${a.name} (${a.iata})`,
    subLabel: a.country
  })), []);

  const airlineOptions = React.useMemo(() => AIRLINES.map(a => ({
    label: a.name,
    value: a.name,
    subLabel: a.iata
  })), []);

  const [datePickerConfig, setDatePickerConfig] = useState<{
    show: boolean;
    mode: 'date' | 'time';
    target: 'departure' | 'arrival';
    currentDate: Date;
  }>({ show: false, mode: 'date', target: 'departure', currentDate: new Date() });

  const handleOpenPicker = (target: 'departure' | 'arrival') => {
    const currentValue = docForm.journey[target];
    const dateObj = currentValue ? new Date(currentValue) : new Date();
    setDatePickerConfig({ show: true, mode: 'date', target, currentDate: dateObj });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setDatePickerConfig(prev => ({ ...prev, show: false }));
      return;
    }

    const target = datePickerConfig.target;
    
    if (datePickerConfig.mode === 'date') {
      // Date selected, now show time picker (on Android we need this, on iOS we could just use datetime mode but this is safer)
      setDatePickerConfig(prev => ({ ...prev, mode: 'time', currentDate: selectedDate, show: Platform.OS === 'ios' ? false : true }));
      
      // If iOS, we actually want to handle datetime differently, but doing sequential date -> time works universally or we can format immediately
      if (Platform.OS === 'ios') {
        setDocForm(p => ({ ...p, journey: { ...p.journey, [target]: format(selectedDate, 'yyyy-MM-dd HH:mm') } }));
      }
    } else {
      // Time selected
      setDatePickerConfig(prev => ({ ...prev, show: false }));
      setDocForm(p => ({ ...p, journey: { ...p.journey, [target]: format(selectedDate, 'yyyy-MM-dd HH:mm') } }));
    }
  };

  const generateMutation = useGenerateDocument();

  const handleGenerate = () => {
    generateMutation.mutate({ id: Number(id), data: docForm }, {
      onSuccess: async (blobData: any) => {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blobData);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            
            const fileUri = FileSystem.documentDirectory + `Ticket_${docForm.passengers[0].first_name}_${docForm.flight.pnr}.pdf`;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } else {
              Alert.alert('Success', 'PDF generated, but sharing is not available on this device.');
            }
          };
        } catch (e) {
          Alert.alert('Error', 'Failed to process PDF download.');
        }
      },
      onError: (err: any) => {
        Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to generate document');
      }
    });
  };

  const addPassenger = () => {
    setDocForm(prev => ({
      ...prev,
      passengers: [...prev.passengers, { title: 'Mr', first_name: '', last_name: '', passport: '' }]
    }));
  };

  const removePassenger = (index: number) => {
    setDocForm(prev => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index)
    }));
  };

  const updatePassenger = (index: number, field: string, value: string) => {
    setDocForm(prev => {
      const p = [...prev.passengers];
      p[index] = { ...p[index], [field]: value };
      return { ...prev, passengers: p };
    });
  };

  if (!item) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-white">Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-4"><Text className="text-primary-500">Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const InputField = ({ label, value, onChangeText, placeholder }: any) => (
    <View className="mb-4">
      <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">{label}</Text>
      <TextInput
        className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-base"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="bg-card pt-14 pb-4 px-4 border-b border-border flex-row items-center justify-between z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-800/50">
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Generate PDF</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        {/* Passengers */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Passengers</Text>
            <TouchableOpacity onPress={addPassenger} className="flex-row items-center bg-primary-500/20 px-3 py-1.5 rounded-full border border-primary-500/30">
              <Plus size={14} color="#f97316" />
              <Text className="text-primary-500 text-xs font-bold ml-1">Add</Text>
            </TouchableOpacity>
          </View>
          
          {docForm.passengers.map((p, idx) => (
            <View key={idx} className="bg-card border border-border p-4 rounded-2xl mb-4 relative">
              {idx > 0 && (
                <TouchableOpacity onPress={() => removePassenger(idx)} className="absolute top-4 right-4 z-10 w-8 h-8 items-center justify-center bg-red-500/20 rounded-full">
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              )}
              <InputField label="Title" value={p.title} onChangeText={(v: string) => updatePassenger(idx, 'title', v)} placeholder="Mr/Ms" />
              <InputField label="First Name" value={p.first_name} onChangeText={(v: string) => updatePassenger(idx, 'first_name', v)} placeholder="John" />
              <InputField label="Last Name" value={p.last_name} onChangeText={(v: string) => updatePassenger(idx, 'last_name', v)} placeholder="Doe" />
            </View>
          ))}
        </View>

        {/* Flight Details */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-4">Flight Details</Text>
          <View className="bg-card border border-border p-4 rounded-2xl">
            <View className="mb-4">
              <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Airline</Text>
              <TouchableOpacity
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                onPress={() => airlineSheetRef.current?.present()}
              >
                <Text className={docForm.flight.airline ? 'text-white text-base' : 'text-slate-500 text-base'} numberOfLines={1}>
                  {docForm.flight.airline || 'Select Airline'}
                </Text>
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <InputField label="Flight Number" value={docForm.flight.flight_number} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, flight_number: v}}))} placeholder="EK 123" />
            <InputField label="PNR" value={docForm.flight.pnr} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, pnr: v}}))} placeholder="XYZ123" />
            <InputField label="Ticket Number" value={docForm.flight.ticket_number} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, ticket_number: v}}))} placeholder="176-12345678" />
            <InputField label="Class" value={docForm.flight.class} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, class: v}}))} placeholder="Economy" />
            <InputField label="Baggage" value={docForm.flight.baggage} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, baggage: v}}))} placeholder="30 Kg" />
            <InputField label="Status" value={docForm.flight.status} onChangeText={(v: string) => setDocForm(p => ({...p, flight: {...p.flight, status: v}}))} placeholder="Confirmed" />
          </View>
        </View>

        {/* Journey Details */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Journey Details</Text>
          <View className="bg-card border border-border p-4 rounded-2xl">
            <View className="mb-4">
              <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">From (Origin)</Text>
              <TouchableOpacity
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                onPress={() => fromSheetRef.current?.present()}
              >
                <Text className={docForm.journey.from ? 'text-white text-base flex-1' : 'text-slate-500 text-base flex-1'} numberOfLines={1}>
                  {docForm.journey.from || 'Select Origin Airport'}
                </Text>
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="mb-4">
              <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">To (Destination)</Text>
              <TouchableOpacity
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                onPress={() => toSheetRef.current?.present()}
              >
                <Text className={docForm.journey.to ? 'text-white text-base flex-1' : 'text-slate-500 text-base flex-1'} numberOfLines={1}>
                  {docForm.journey.to || 'Select Destination Airport'}
                </Text>
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="mb-4">
              <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Departure Time</Text>
              <TouchableOpacity
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row items-center"
                onPress={() => handleOpenPicker('departure')}
              >
                <CalendarIcon size={20} color="#94a3b8" />
                <Text className={docForm.journey.departure ? 'text-white text-base ml-3' : 'text-slate-500 text-base ml-3'}>
                  {docForm.journey.departure || 'Select Date & Time'}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mb-4">
              <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Arrival Time</Text>
              <TouchableOpacity
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row items-center"
                onPress={() => handleOpenPicker('arrival')}
              >
                <CalendarIcon size={20} color="#94a3b8" />
                <Text className={docForm.journey.arrival ? 'text-white text-base ml-3' : 'text-slate-500 text-base ml-3'}>
                  {docForm.journey.arrival || 'Select Date & Time'}
                </Text>
              </TouchableOpacity>
            </View>
            <InputField label="Terminal" value={docForm.journey.terminal} onChangeText={(v: string) => setDocForm(p => ({...p, journey: {...p.journey, terminal: v}}))} placeholder="T3" />
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View className="p-4 bg-card border-t border-border">
        <TouchableOpacity
          className={`py-4 rounded-xl flex-row items-center justify-center ${generateMutation.isPending ? 'bg-primary-500/50' : 'bg-primary-500'}`}
          onPress={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color="#fff" className="mr-2" />
          ) : (
            <Download size={20} color="#fff" className="mr-2" />
          )}
          <Text className="text-white font-bold text-base">
            {generateMutation.isPending ? 'Generating PDF...' : 'Download PDF Ticket'}
          </Text>
        </TouchableOpacity>
      </View>

      <TravelSelectorSheet
        ref={airlineSheetRef}
        title="Select Airline"
        options={airlineOptions}
        selectedValue={docForm.flight.airline}
        onSelect={(val) => {
          setDocForm(p => ({...p, flight: {...p.flight, airline: val}}));
          airlineSheetRef.current?.dismiss();
        }}
      />
      <TravelSelectorSheet
        ref={fromSheetRef}
        title="Select Origin Airport"
        options={airportOptions}
        selectedValue={docForm.journey.from}
        onSelect={(val) => {
          setDocForm(p => ({...p, journey: {...p.journey, from: val}}));
          fromSheetRef.current?.dismiss();
        }}
      />
      <TravelSelectorSheet
        ref={toSheetRef}
        title="Select Destination Airport"
        options={airportOptions}
        selectedValue={docForm.journey.to}
        onSelect={(val) => {
          setDocForm(p => ({...p, journey: {...p.journey, to: val}}));
          toSheetRef.current?.dismiss();
        }}
      />

      {datePickerConfig.show && (
        <DateTimePicker
          value={datePickerConfig.currentDate}
          mode={Platform.OS === 'ios' ? 'datetime' : datePickerConfig.mode}
          display="default"
          onChange={handleDateChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}
