import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  TextInput, Modal, SafeAreaView, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, DollarSign, Plus, X, Trash2, AlertCircle } from 'lucide-react-native';
import { useCreditCardSummary, useAccountsForCC } from '../api/reports';
import { formatCurrency } from '../../../utils/format';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api/api';

interface PaymentSource {
  account_id: string;
  amount: string;
}

export default function CreditCardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: cards, isLoading, error, refetch } = useCreditCardSummary();
  const { data: accounts = [] } = useAccountsForCC();

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [targetAmount, setTargetAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sources, setSources] = useState<PaymentSource[]>([{ account_id: '', amount: '' }]);
  const [saving, setSaving] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState<number | null>(null);

  const openModal = (card: any) => {
    setSelectedCard(card);
    const outstanding = card.outstanding ?? '0';
    setTargetAmount(outstanding);
    setSources([{ account_id: '', amount: outstanding }]);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const closeModal = () => {
    setSelectedCard(null);
    setSources([{ account_id: '', amount: '' }]);
    setTargetAmount('');
  };

  const totalSources = sources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const target = parseFloat(targetAmount) || 0;
  const isMatch = Math.abs(totalSources - target) < 0.001;

  const handlePay = async () => {
    if (!selectedCard) return;
    if (!isMatch) {
      Alert.alert('Mismatch', 'Total payment sources must equal the target amount.');
      return;
    }
    for (const s of sources) {
      if (!s.account_id || !s.amount) {
        Alert.alert('Incomplete', 'All payment sources must have an account and amount.');
        return;
      }
    }

    setSaving(true);
    try {
      const entries: any[] = [{ account_id: selectedCard.id, debit: target, credit: 0 }];
      sources.forEach(s => {
        entries.push({ account_id: parseInt(s.account_id), debit: 0, credit: parseFloat(s.amount) });
      });

      await api.post('/transactions', {
        type: 'credit_card_payment',
        date,
        amount: target,
        description: `CC Payment - ${selectedCard.name}`,
        entries,
      });

      Alert.alert('Success', 'Credit card payment recorded!');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['credit-card-summary'] });
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const renderCard = ({ item: card }: { item: any }) => {
    const outstanding = parseFloat(card.outstanding ?? '0');
    const limit = card.credit_limit ? parseFloat(card.credit_limit) : null;
    const available = card.available_balance != null ? parseFloat(card.available_balance) : null;
    const usedPct = limit && limit > 0 ? Math.min(outstanding / limit, 1) : 0;

    return (
      <View style={{ backgroundColor: '#1e293b', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
        {/* Top accent */}
        <View style={{ height: 4, backgroundColor: '#f97316' }} />
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <CreditCard size={22} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 16 }}>{card.name}</Text>
              <Text style={{ color: '#64748b', fontSize: 12 }}>
                {card.parent_account_id ? `Supplementary · ${card.parent_name}` : 'Primary Credit Card'}
              </Text>
            </View>
          </View>

          {/* Balances */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 3 }}>Outstanding</Text>
              <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 20 }}>{formatCurrency(outstanding)}</Text>
            </View>
            {available != null && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 3 }}>Available</Text>
                <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 16 }}>{formatCurrency(available)}</Text>
              </View>
            )}
          </View>

          {/* Limit + progress */}
          {limit && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>Credit Limit</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>{formatCurrency(limit)}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 5, backgroundColor: usedPct > 0.8 ? '#ef4444' : '#f97316', width: `${usedPct * 100}%`, borderRadius: 3 }} />
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => openModal(card)}
            style={{ backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          >
            <DollarSign size={16} color="#f97316" />
            <Text style={{ color: '#f97316', fontWeight: '700', marginLeft: 6 }}>Pay Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
      <SafeAreaView>
        <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={22} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' }}>Credit Cards</Text>
            <View style={{ width: 38 }} />
          </View>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 16, marginTop: 12 }}>Failed to load</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ backgroundColor: '#f97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !cards || cards.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <CreditCard size={64} color="#334155" />
          <Text style={{ color: '#64748b', fontSize: 16, marginTop: 16, textAlign: 'center' }}>No credit cards found.{'\n'}Add credit card accounts first.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        />
      )}

      {/* Pay Bill Modal */}
      <Modal visible={!!selectedCard} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' }}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '800' }}>Pay Bill</Text>
                  <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{selectedCard?.name}</Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 8 }}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Target Amount + Date */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>TARGET AMOUNT</Text>
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <TextInput
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#475569"
                        style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>DATE</Text>
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#475569"
                        style={{ color: '#f8fafc', fontSize: 14 }}
                      />
                    </View>
                  </View>
                </View>

                {/* Payment Sources */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 15 }}>Payment Sources</Text>
                  <TouchableOpacity onPress={() => setSources([...sources, { account_id: '', amount: '' }])}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Plus size={14} color="#f97316" />
                    <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Add</Text>
                  </TouchableOpacity>
                </View>

                {sources.map((source, idx) => {
                  const selectedAcc = accounts.find(a => a.id.toString() === source.account_id);
                  return (
                    <View key={idx} style={{ backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600' }}>SOURCE {idx + 1}</Text>
                        {sources.length > 1 && (
                          <TouchableOpacity onPress={() => setSources(sources.filter((_, i) => i !== idx))}>
                            <Trash2 size={15} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowAccountPicker(idx)}
                        style={{ backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }}
                      >
                        <Text style={{ color: selectedAcc ? '#f8fafc' : '#475569', fontSize: 14 }}>
                          {selectedAcc ? selectedAcc.name : 'Select Account'}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 11 }}>
                        <TextInput
                          value={source.amount}
                          onChangeText={(v) => { const n = [...sources]; n[idx].amount = v; setSources(n); }}
                          keyboardType="decimal-pad"
                          placeholder="Amount"
                          placeholderTextColor="#475569"
                          style={{ color: '#f8fafc', fontSize: 14 }}
                        />
                      </View>
                    </View>
                  );
                })}

                {/* Match indicator */}
                {target > 0 && (
                  <View style={{ backgroundColor: isMatch ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isMatch ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>Total paid:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: isMatch ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 15 }}>{formatCurrency(totalSources)}</Text>
                      {!isMatch && <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600' }}>Mismatch</Text>}
                    </View>
                  </View>
                )}

                {/* Pay button */}
                <TouchableOpacity
                  onPress={handlePay}
                  disabled={saving || !isMatch || target <= 0}
                  style={{ backgroundColor: isMatch && target > 0 ? '#f97316' : '#334155', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    {saving ? 'Processing...' : 'Pay Bill'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Picker Modal */}
      <Modal visible={showAccountPicker !== null} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#f8fafc', fontSize: 17, fontWeight: '700' }}>Select Account</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={accounts}
              keyExtractor={(a) => a.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    const n = [...sources];
                    n[showAccountPicker!].account_id = item.id.toString();
                    setSources(n);
                    setShowAccountPicker(null);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
                >
                  <Text style={{ color: '#f8fafc', fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>{item.type}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
