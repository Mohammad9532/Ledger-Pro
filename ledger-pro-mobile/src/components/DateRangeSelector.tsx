import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD (optional, if undefined, it's a single date picker)
  onChange: (start: string, end?: string) => void;
  singleDateOnly?: boolean;
}

export function DateRangeSelector({ startDate, endDate, onChange, singleDateOnly = false }: DateRangeSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempStart, setTempStart] = useState(new Date(startDate));
  const [tempEnd, setTempEnd] = useState(endDate ? new Date(endDate) : new Date());
  
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const handleConfirm = () => {
    onChange(
      format(tempStart, 'yyyy-MM-dd'),
      singleDateOnly ? undefined : format(tempEnd, 'yyyy-MM-dd')
    );
    setShowModal(false);
  };

  const displayDate = singleDateOnly 
    ? format(new Date(startDate), 'MMM dd, yyyy')
    : `${format(new Date(startDate), 'MMM dd')} - ${format(endDate ? new Date(endDate) : new Date(), 'MMM dd, yyyy')}`;

  return (
    <>
      <TouchableOpacity 
        className="flex-row items-center bg-slate-800/80 px-4 py-2.5 rounded-xl border border-border"
        onPress={() => {
          setTempStart(new Date(startDate));
          if (endDate) setTempEnd(new Date(endDate));
          setShowModal(true);
        }}
      >
        <Calendar size={18} color="#94a3b8" />
        <Text className="text-white ml-2 flex-1 font-medium">{displayDate}</Text>
        <ChevronRight size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-card rounded-t-3xl border-t border-border p-5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-lg font-bold">
                Select Date {singleDateOnly ? '' : 'Range'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} className="bg-slate-800 p-2 rounded-full">
                <X size={20} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-4 mb-6">
              <TouchableOpacity 
                className={`flex-1 p-3 rounded-xl border ${activePicker === 'start' ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-slate-800/50'}`}
                onPress={() => setActivePicker('start')}
              >
                <Text className="text-muted text-xs mb-1">{singleDateOnly ? 'Date' : 'Start Date'}</Text>
                <Text className="text-white font-bold">{format(tempStart, 'MMM dd, yyyy')}</Text>
              </TouchableOpacity>

              {!singleDateOnly && (
                <TouchableOpacity 
                  className={`flex-1 p-3 rounded-xl border ${activePicker === 'end' ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-slate-800/50'}`}
                  onPress={() => setActivePicker('end')}
                >
                  <Text className="text-muted text-xs mb-1">End Date</Text>
                  <Text className="text-white font-bold">{format(tempEnd, 'MMM dd, yyyy')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {activePicker && Platform.OS === 'ios' && (
              <View className="bg-slate-800/50 rounded-xl p-2 mb-6">
                <DateTimePicker
                  value={activePicker === 'start' ? tempStart : tempEnd}
                  mode="date"
                  display="inline"
                  themeVariant="dark"
                  onChange={(event, date) => {
                    if (date) {
                      if (activePicker === 'start') setTempStart(date);
                      else setTempEnd(date);
                    }
                  }}
                />
              </View>
            )}

            {activePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={activePicker === 'start' ? tempStart : tempEnd}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setActivePicker(null);
                  if (date && event.type === 'set') {
                    if (activePicker === 'start') setTempStart(date);
                    else setTempEnd(date);
                  }
                }}
              />
            )}

            <TouchableOpacity 
              className="bg-primary-500 p-4 rounded-xl items-center"
              onPress={handleConfirm}
            >
              <Text className="text-white font-bold text-lg">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
