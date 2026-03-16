import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, ScrollView, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createVehicleEarning, createVehicleExpense, getVehicleEarnings, getVehicleExpenses } from '../api/vehicleFinancials';
import { useAppTheme } from '../theme';

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [dateObj, setDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const date = formatDate(dateObj);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Trip');
  const [period, setPeriod] = useState('Daily');
  const [category, setCategory] = useState('Fuel');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: entryType === 'earning' ? 'Add Earning' : 'Add Expense' });
  }, [navigation, entryType]);

  useEffect(() => {
    if (!vehicleId) return;
    let mounted = true;
    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const data = await getVehicleEarnings(vehicleId);
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data?.$values || data?.items || []);
        setRecentEarnings(arr.slice(0, 10));
      } catch (e) {
        console.warn('Failed to load recent earnings', e);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => { mounted = false; };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    let mounted = true;
    async function loadExpenses() {
      try {
        setLoadingExpenses(true);
        const data = await getVehicleExpenses(vehicleId);
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data?.$values || data?.items || []);
        setRecentExpenses(arr.slice(0, 10));
      } catch (e) {
        console.warn('Failed to load recent expenses', e);
      } finally {
        if (mounted) setLoadingExpenses(false);
      }
    }
    loadExpenses();
    return () => { mounted = false; };
  }, [vehicleId]);

  function validate() {
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle is missing.');
      return false;
    }
    if (!date?.trim()) {
      Alert.alert('Validation', 'Date is required.');
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

  function fmtDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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

      <Text style={styles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <View style={{ position: 'relative' }}>
          <View style={[styles.dateBtn, { pointerEvents: 'none' }]}>
            <Text style={styles.dateBtnText}>{date}</Text>
            <Text style={styles.dateIcon}>📅</Text>
          </View>
          <input
            type="date"
            value={date}
            onChange={e => {
              const d = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(d.getTime())) setDateObj(d);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
            }}
          />
        </View>
      ) : (
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateBtnText}>{date}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      )}

      {/* Android: inline picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) setDateObj(selected);
          }}
        />
      )}

      {/* iOS: picker inside a modal */}
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="spinner"
                onChange={(_, selected) => { if (selected) setDateObj(selected); }}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}

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

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Earnings (Last 10)</Text>
        {loadingHistory ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : recentEarnings.length === 0 ? (
          <Text style={styles.historyEmpty}>No recent earnings recorded.</Text>
        ) : (
          recentEarnings.map((item, idx) => (
            <View key={item.id || idx} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historySource}>{item.source || item.Source || 'Trip'}</Text>
                <Text style={styles.historyDesc} numberOfLines={1}>
                  {item.description || item.Description || item.period || item.Period || ''}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>R{Number(item.amount || item.Amount || 0).toFixed(2)}</Text>
                <Text style={styles.historyDate}>{fmtDate(item.date || item.Date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Expenses (Last 10)</Text>
        {loadingExpenses ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : recentExpenses.length === 0 ? (
          <Text style={styles.historyEmpty}>No recent expenses recorded.</Text>
        ) : (
          recentExpenses.map((item, idx) => (
            <View key={item.id || idx} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historySource}>{item.category || item.Category || 'Expense'}</Text>
                <Text style={styles.historyDesc} numberOfLines={1}>
                  {item.description || item.Description || item.vendor || item.Vendor || ''}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: c.danger }]}>R{Number(item.amount || item.Amount || 0).toFixed(2)}</Text>
                <Text style={styles.historyDate}>{fmtDate(item.date || item.Date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    title: { fontSize: 16, fontWeight: '900', marginBottom: 12, color: c.text },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text },
    dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface },
    dateBtnText: { fontSize: 15, color: c.text, fontWeight: '600' },
    dateIcon: { fontSize: 18 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    modalAction: { fontSize: 15, fontWeight: '600' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    btnPrimary: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    toggleRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: c.border },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: c.text },
    toggleText: { fontWeight: '900', color: c.text },
    toggleTextActive: { color: c.background },
    historySection: { marginTop: 24, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 },
    historyTitle: { fontSize: 13, fontWeight: '900', color: c.text, marginBottom: 10 },
    historyEmpty: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    historyLeft: { flex: 1, paddingRight: 12 },
    historySource: { fontSize: 14, fontWeight: '700', color: c.text },
    historyDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    historyRight: { alignItems: 'flex-end' },
    historyAmount: { fontSize: 14, fontWeight: '900', color: c.success },
    historyDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  });
}
