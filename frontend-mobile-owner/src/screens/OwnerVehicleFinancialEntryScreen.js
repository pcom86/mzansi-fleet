import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { createVehicleEarning, createVehicleExpense } from '../api/vehicleFinancials';
import { useAppTheme } from '../theme';

function toAmount(val) {
  const n = Number(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export default function OwnerVehicleFinancialEntryScreen({ route, navigation }) {
  const vehicle = route?.params?.vehicle || null;
  const defaultType = route?.params?.type || 'expense';

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const vehicleId = useMemo(() => vehicle?.id || vehicle?.Id || vehicle?.vehicleId || null, [vehicle]);
  const reg = useMemo(() => vehicle?.registration || vehicle?.Registration || '', [vehicle]);

  const [entryType, setEntryType] = useState(defaultType === 'earning' ? 'earning' : 'expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Trip');
  const [period, setPeriod] = useState('Daily');
  const [category, setCategory] = useState('Fuel');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: entryType === 'earning' ? 'Add Earning' : 'Add Expense' });
  }, [navigation, entryType]);

  function validate() {
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle is missing.');
      return false;
    }
    if (!date?.trim()) {
      Alert.alert('Validation', 'Date is required (YYYY-MM-DD).');
      return false;
    }
    const a = toAmount(amount);
    if (!Number.isFinite(a) || a <= 0) {
      Alert.alert('Validation', 'Amount must be greater than 0.');
      return false;
    }
    if (entryType === 'earning') {
      if (!source?.trim()) {
        Alert.alert('Validation', 'Source is required.');
        return false;
      }
      if (!period?.trim()) {
        Alert.alert('Validation', 'Period is required.');
        return false;
      }
    } else {
      if (!category?.trim()) {
        Alert.alert('Validation', 'Category is required.');
        return false;
      }
    }
    return true;
  }

  async function onSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      const a = toAmount(amount);

      if (entryType === 'earning') {
        await createVehicleEarning({
          id: '00000000-0000-0000-0000-000000000000',
          vehicleId,
          date,
          amount: a,
          source,
          description: description || '',
          period,
        });
      } else {
        await createVehicleExpense({
          id: '00000000-0000-0000-0000-000000000000',
          vehicleId,
          date,
          amount: a,
          category,
          description: description || '',
          vendor: vendor || '',
          invoiceNumber: invoiceNumber || '',
        });
      }

      Alert.alert('Saved', 'Entry recorded successfully');
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to save financial entry', e);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle {reg ? `(${reg})` : ''}</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'expense' && styles.toggleBtnActive]}
          onPress={() => setEntryType('expense')}
          disabled={saving}
        >
          <Text style={[styles.toggleText, entryType === 'expense' && styles.toggleTextActive]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'earning' && styles.toggleBtnActive]}
          onPress={() => setEntryType('earning')}
          disabled={saving}
        >
          <Text style={[styles.toggleText, entryType === 'earning' && styles.toggleTextActive]}>Earning</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="2026-02-26" placeholderTextColor={c.textMuted} />

      <Text style={styles.label}>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="0.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />

      {entryType === 'earning' ? (
        <>
          <Text style={styles.label}>Source</Text>
          <TextInput value={source} onChangeText={setSource} style={styles.input} placeholder="Trip / Rental / Delivery" placeholderTextColor={c.textMuted} />

          <Text style={styles.label}>Period</Text>
          <TextInput value={period} onChangeText={setPeriod} style={styles.input} placeholder="Daily / Weekly / Monthly" placeholderTextColor={c.textMuted} />
        </>
      ) : (
        <>
          <Text style={styles.label}>Category</Text>
          <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholder="Fuel / Maintenance / Insurance" placeholderTextColor={c.textMuted} />

          <Text style={styles.label}>Vendor (optional)</Text>
          <TextInput value={vendor} onChangeText={setVendor} style={styles.input} placeholder="Vendor" placeholderTextColor={c.textMuted} />

          <Text style={styles.label}>Invoice Number (optional)</Text>
          <TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} style={styles.input} placeholder="Invoice #" placeholderTextColor={c.textMuted} />
        </>
      )}

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={c.textMuted} multiline />

      <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnPrimaryText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    title: { fontSize: 16, fontWeight: '900', marginBottom: 12, color: c.text },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    btnPrimary: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    toggleRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: c.border },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: c.text },
    toggleText: { fontWeight: '900', color: c.text },
    toggleTextActive: { color: c.background },
  });
}
