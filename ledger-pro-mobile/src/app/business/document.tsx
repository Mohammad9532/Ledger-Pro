import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Download, Plus, Trash2, Copy } from 'lucide-react-native';
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

const defaultSegment = () => ({ 
  airline: '', flight_number: '', pnr: '', ticket_number: '', 
  class: 'Economy', seat: '', baggage: '30 Kg', cabin_baggage: '7 Kg', 
  from: '', to: '', departure: '', arrival: '', terminal: '', gate: '', 
  same_as_first: false 
});

export default function GenerateDocumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: listData } = useBusinessItems();
  const item = listData?.data?.find(i => i.id.toString() === id);

  // Initialize with existing metadata if available
  const existingDoc = item?.metadata?.document_type === 'flight' ? item.metadata : null;

  // Build initial segments from existing data
  const buildInitialSegments = () => {
    if (!existingDoc) return [defaultSegment()];
    if (existingDoc.segments && Array.isArray(existingDoc.segments) && existingDoc.segments.length > 0) {
      return existingDoc.segments.map((s: any) => ({ ...defaultSegment(), ...s }));
    }
    // Legacy: convert single flight+journey into one segment
    const seg = defaultSegment();
    if (existingDoc.flight) {
      Object.assign(seg, {
        airline: existingDoc.flight.airline || '', flight_number: existingDoc.flight.flight_number || '',
        pnr: existingDoc.flight.pnr || '', ticket_number: existingDoc.flight.ticket_number || '',
        class: existingDoc.flight.class || 'Economy', seat: existingDoc.flight.seat || '',
        baggage: existingDoc.flight.baggage || '30 Kg', cabin_baggage: existingDoc.flight.cabin_baggage || '7 Kg',
      });
    }
    if (existingDoc.journey) {
      Object.assign(seg, {
        from: existingDoc.journey.from || '', to: existingDoc.journey.to || '',
        departure: existingDoc.journey.departure || '', arrival: existingDoc.journey.arrival || '',
        terminal: existingDoc.journey.terminal || '', gate: existingDoc.journey.gate || '',
      });
    }
    return [seg];
  };

  const [docForm, setDocForm] = useState({
    document_type: 'flight',
    passengers: existingDoc?.passengers || [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
    segments: buildInitialSegments(),
    status: existingDoc?.status || existingDoc?.flight?.status || 'Confirmed',
    booking_date: existingDoc?.booking_date || existingDoc?.journey?.booking_date || format(new Date(), 'yyyy-MM-dd'),
    fare: existingDoc?.fare || existingDoc?.flight?.fare || ''
  });

  // Track which segment's selector is active
  const [activeSegIdx, setActiveSegIdx] = useState(0);

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
    segIdx: number;
    currentDate: Date;
  }>({ show: false, mode: 'date', target: 'departure', segIdx: 0, currentDate: new Date() });

  const handleOpenPicker = (target: 'departure' | 'arrival', segIdx: number) => {
    const currentValue = docForm.segments[segIdx]?.[target];
    const dateObj = currentValue ? new Date(currentValue) : new Date();
    setDatePickerConfig({ show: true, mode: 'date', target, segIdx, currentDate: dateObj });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setDatePickerConfig(prev => ({ ...prev, show: false }));
      return;
    }

    const { target, segIdx } = datePickerConfig;
    
    if (datePickerConfig.mode === 'date') {
      setDatePickerConfig(prev => ({ ...prev, mode: 'time', currentDate: selectedDate, show: Platform.OS === 'ios' ? false : true }));
      
      if (Platform.OS === 'ios') {
        updateSegment(segIdx, target, format(selectedDate, 'yyyy-MM-dd HH:mm'));
      }
    } else {
      setDatePickerConfig(prev => ({ ...prev, show: false }));
      updateSegment(segIdx, target, format(selectedDate, 'yyyy-MM-dd HH:mm'));
    }
  };

  const updateSegment = (idx: number, field: string, value: any) => {
    setDocForm(prev => {
      const newSegs = [...prev.segments];
      newSegs[idx] = { ...newSegs[idx], [field]: value };
      return { ...prev, segments: newSegs };
    });
  };

  const addSegment = () => {
    setDocForm(prev => ({
      ...prev,
      segments: [...prev.segments, defaultSegment()]
    }));
  };

  const removeSegment = (idx: number) => {
    setDocForm(prev => ({
      ...prev,
      segments: prev.segments.filter((_: any, i: number) => i !== idx)
    }));
  };

  const toggleSameAsFirst = (idx: number, checked: boolean) => {
    setDocForm(prev => {
      const newSegs = [...prev.segments];
      const first = newSegs[0];
      newSegs[idx] = checked
        ? { ...newSegs[idx], same_as_first: true, airline: first.airline, pnr: first.pnr, ticket_number: first.ticket_number, class: first.class, baggage: first.baggage, cabin_baggage: first.cabin_baggage }
        : { ...newSegs[idx], same_as_first: false };
      return { ...prev, segments: newSegs };
    });
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
            
            const pnr = docForm.segments[0]?.pnr || 'ticket';
            const fileUri = FileSystem.documentDirectory + `Ticket_${docForm.passengers[0].first_name}_${pnr}.pdf`;
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
      passengers: prev.passengers.filter((_: any, i: number) => i !== index)
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

  const InputField = ({ label, value, onChangeText, placeholder, editable = true }: any) => (
    <View className="mb-4">
      <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">{label}</Text>
      <TextInput
        className={`bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-base ${editable ? 'text-white' : 'text-slate-500'}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        editable={editable}
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
          
          {docForm.passengers.map((p: any, idx: number) => (
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

        {/* Booking Info */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-4">Booking Info</Text>
          <View className="bg-card border border-border p-4 rounded-2xl">
            <InputField label="Status" value={docForm.status} onChangeText={(v: string) => setDocForm(p => ({...p, status: v}))} placeholder="Confirmed" />
          </View>
        </View>

        {/* Flight Segments */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Flight Segments</Text>
            <TouchableOpacity onPress={addSegment} className="flex-row items-center bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/30">
              <Plus size={14} color="#3b82f6" />
              <Text className="text-blue-400 text-xs font-bold ml-1">Add Via</Text>
            </TouchableOpacity>
          </View>

          {docForm.segments.map((seg: any, sIdx: number) => {
            const isFirst = sIdx === 0;
            const firstSeg = docForm.segments[0];
            const isSame = seg.same_as_first && !isFirst;

            return (
              <View key={sIdx} className="bg-card border border-border p-4 rounded-2xl mb-4">
                {/* Segment Header */}
                <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-border">
                  <Text className="text-primary-500 text-sm font-bold">
                    SEGMENT {sIdx + 1}
                    {seg.from && seg.to ? `: ${(seg.from.match(/\(([^)]+)\)/)?.[1] || seg.from)} → ${(seg.to.match(/\(([^)]+)\)/)?.[1] || seg.to)}` : ''}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {!isFirst && (
                      <TouchableOpacity 
                        onPress={() => toggleSameAsFirst(sIdx, !seg.same_as_first)} 
                        className={`flex-row items-center px-2.5 py-1 rounded-full border ${seg.same_as_first ? 'bg-blue-500/30 border-blue-500/50' : 'bg-slate-800/50 border-slate-700'}`}
                      >
                        <Copy size={12} color={seg.same_as_first ? '#60a5fa' : '#94a3b8'} />
                        <Text className={`text-xs font-medium ml-1 ${seg.same_as_first ? 'text-blue-400' : 'text-slate-400'}`}>Same</Text>
                      </TouchableOpacity>
                    )}
                    {docForm.segments.length > 1 && (
                      <TouchableOpacity onPress={() => removeSegment(sIdx)} className="w-7 h-7 items-center justify-center bg-red-500/20 rounded-full">
                        <Trash2 size={12} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Flight Details */}
                <View className="mb-4">
                  <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Airline</Text>
                  <TouchableOpacity
                    className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                    onPress={() => { setActiveSegIdx(sIdx); airlineSheetRef.current?.present(); }}
                    disabled={isSame}
                  >
                    <Text className={(isSame ? firstSeg.airline : seg.airline) ? 'text-white text-base' : 'text-slate-500 text-base'} numberOfLines={1}>
                      {(isSame ? firstSeg.airline : seg.airline) || 'Select Airline'}
                    </Text>
                    <ChevronRight size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <InputField label="Flight Number" value={seg.flight_number} onChangeText={(v: string) => updateSegment(sIdx, 'flight_number', v)} placeholder="EK 123" />
                <InputField label="PNR" value={isSame ? firstSeg.pnr : seg.pnr} onChangeText={(v: string) => updateSegment(sIdx, 'pnr', v)} placeholder="XYZ123" editable={!isSame} />
                <InputField label="Ticket Number" value={isSame ? firstSeg.ticket_number : seg.ticket_number} onChangeText={(v: string) => updateSegment(sIdx, 'ticket_number', v)} placeholder="176-12345678" editable={!isSame} />
                <InputField label="Class" value={isSame ? firstSeg.class : seg.class} onChangeText={(v: string) => updateSegment(sIdx, 'class', v)} placeholder="Economy" editable={!isSame} />
                <InputField label="Baggage" value={isSame ? firstSeg.baggage : seg.baggage} onChangeText={(v: string) => updateSegment(sIdx, 'baggage', v)} placeholder="30 Kg" editable={!isSame} />

                {/* Route & Schedule */}
                <View className="border-t border-border pt-4 mt-2">
                  <Text className="text-slate-500 text-xs font-bold mb-3">ROUTE & SCHEDULE</Text>
                  
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">From (Origin)</Text>
                    <TouchableOpacity
                      className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                      onPress={() => { setActiveSegIdx(sIdx); fromSheetRef.current?.present(); }}
                    >
                      <Text className={seg.from ? 'text-white text-base flex-1' : 'text-slate-500 text-base flex-1'} numberOfLines={1}>
                        {seg.from || 'Select Origin Airport'}
                      </Text>
                      <ChevronRight size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">To (Destination)</Text>
                    <TouchableOpacity
                      className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center"
                      onPress={() => { setActiveSegIdx(sIdx); toSheetRef.current?.present(); }}
                    >
                      <Text className={seg.to ? 'text-white text-base flex-1' : 'text-slate-500 text-base flex-1'} numberOfLines={1}>
                        {seg.to || 'Select Destination Airport'}
                      </Text>
                      <ChevronRight size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Departure Time</Text>
                    <TouchableOpacity
                      className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row items-center"
                      onPress={() => handleOpenPicker('departure', sIdx)}
                    >
                      <CalendarIcon size={20} color="#94a3b8" />
                      <Text className={seg.departure ? 'text-white text-base ml-3' : 'text-slate-500 text-base ml-3'}>
                        {seg.departure || 'Select Date & Time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm font-medium mb-1.5 ml-1">Arrival Time</Text>
                    <TouchableOpacity
                      className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex-row items-center"
                      onPress={() => handleOpenPicker('arrival', sIdx)}
                    >
                      <CalendarIcon size={20} color="#94a3b8" />
                      <Text className={seg.arrival ? 'text-white text-base ml-3' : 'text-slate-500 text-base ml-3'}>
                        {seg.arrival || 'Select Date & Time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <InputField label="Terminal" value={seg.terminal} onChangeText={(v: string) => updateSegment(sIdx, 'terminal', v)} placeholder="T3" />
                </View>
              </View>
            );
          })}
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
        selectedValue={docForm.segments[activeSegIdx]?.airline || ''}
        onSelect={(val) => {
          updateSegment(activeSegIdx, 'airline', val);
          airlineSheetRef.current?.dismiss();
        }}
      />
      <TravelSelectorSheet
        ref={fromSheetRef}
        title="Select Origin Airport"
        options={airportOptions}
        selectedValue={docForm.segments[activeSegIdx]?.from || ''}
        onSelect={(val) => {
          updateSegment(activeSegIdx, 'from', val);
          fromSheetRef.current?.dismiss();
        }}
      />
      <TravelSelectorSheet
        ref={toSheetRef}
        title="Select Destination Airport"
        options={airportOptions}
        selectedValue={docForm.segments[activeSegIdx]?.to || ''}
        onSelect={(val) => {
          updateSegment(activeSegIdx, 'to', val);
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
