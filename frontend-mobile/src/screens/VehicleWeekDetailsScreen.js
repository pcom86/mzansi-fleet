import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getVehicleEarningsByPeriod, getVehicleExpensesByPeriod } from '../api/analytics';
import { useAppTheme } from '../theme';

function asArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val?.$values)) return val.$values;
  if (Array.isArray(val?.values)) return val.values;
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data)) return val.data;
  if (Array.isArray(val?.result)) return val.result;
  return [val];
}

function toNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const s = String(val).replace(/[^0-9.-]+/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return `R${num.toFixed(2)}`;
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString();
}

function extractAmount(x) {
  return toNumber(
    x?.amount ??
      x?.Amount ??
      x?.totalAmount ??
      x?.TotalAmount ??
      x?.value ??
      x?.Value ??
      x?.cost ??
      x?.Cost ??
      x?.fare ??
      x?.Fare ??
      x?.price ??
      x?.Price ??
      x?.total ??
      x?.Total
  );
}

function extractDate(x) {
  return (
    x?.date ||
    x?.Date ||
    x?.transactionDate ||
    x?.TransactionDate ||
    x?.transaction_date ||
    x?.createdAt ||
    x?.CreatedAt ||
    x?.earningDate ||
    x?.EarningDate ||
    x?.expenseDate ||
    x?.ExpenseDate ||
    null
  );
}

function extractTitle(x) {
  const category = x?.category ?? x?.Category;
  const source = x?.source ?? x?.Source;
  const vendor = x?.vendor ?? x?.Vendor;
  const desc = x?.description ?? x?.Description;

  return (
    desc ||
    category ||
    source ||
    vendor ||
    (x?.invoiceNumber ?? x?.InvoiceNumber) ||
    'Entry'
  );
}

export default function VehicleWeekDetailsScreen({ route, navigation }) {
  const vehicleId = route?.params?.vehicleId || null;
  const reg = route?.params?.registration || '';
  const weekLabel = route?.params?.weekLabel || 'Week';
  const startDate = route?.params?.startDate || null;
  const endDate = route?.params?.endDate || null;

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [activeTab, setActiveTab] = useState('earnings');
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    navigation.setOptions({ title: `${reg || 'Vehicle'} ${weekLabel}` });
  }, [navigation, reg, weekLabel]);

  const totals = useMemo(() => {
    const e = earnings.reduce((s, x) => s + toNumber(x.amount), 0);
    const x = expenses.reduce((s, i) => s + toNumber(i.amount), 0);
    return { earnings: e, expenses: x, profit: e - x };
  }, [earnings, expenses]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!vehicleId || !startDate || !endDate) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [eRaw, xRaw] = await Promise.all([
          getVehicleEarningsByPeriod(vehicleId, startDate, endDate),
          getVehicleExpensesByPeriod(vehicleId, startDate, endDate),
        ]);

        if (!mounted) return;

        const eList = asArray(eRaw)
          .map(item => ({
            id: item?.id ?? item?.Id ?? `${extractTitle(item)}-${String(extractDate(item) || '')}-${Math.random()}`,
            title: extractTitle(item),
            amount: extractAmount(item),
            date: extractDate(item),
            raw: item,
          }))
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const xList = asArray(xRaw)
          .map(item => ({
            id: item?.id ?? item?.Id ?? `${extractTitle(item)}-${String(extractDate(item) || '')}-${Math.random()}`,
            title: extractTitle(item),
            amount: extractAmount(item),
            date: extractDate(item),
            raw: item,
          }))
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        setEarnings(eList);
        setExpenses(xList);
      } catch (e) {
        console.warn('Failed to load week details', e);
        Alert.alert('Error', 'Failed to load week details');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [vehicleId, startDate, endDate]);

  function renderRow({ item }, kind) {
    return (
      <View style={styles.rowCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowMeta}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.rowAmount, kind === 'earning' ? styles.amountPlus : styles.amountMinus]}>
          {kind === 'earning' ? '+ ' : '- '}{formatCurrency(item.amount)}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const listData = activeTab === 'earnings' ? earnings : expenses;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Earnings</Text>
          <Text style={[styles.summaryValue, styles.amountPlus]}>{formatCurrency(totals.earnings)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, styles.amountMinus]}>{formatCurrency(totals.expenses)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryDivider]}> 
          <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Profit</Text>
          <Text style={[styles.summaryValue, { fontWeight: '800', color: totals.profit >= 0 ? c.success : c.danger }]}> 
            {formatCurrency(totals.profit)}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'earnings' && styles.tabBtnActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'expenses' && styles.tabBtnActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
      </View>

      {listData.length === 0 ? (
        <Text style={styles.empty}>No {activeTab} entries for this week.</Text>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={(props) => renderRow(props, activeTab === 'earnings' ? 'earning' : 'expense')}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

    summaryCard: { backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    summaryTitle: { fontSize: 14, fontWeight: '900', marginBottom: 8, color: c.text },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    summaryDivider: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
    summaryLabel: { color: c.textMuted, fontWeight: '800' },
    summaryValue: { color: c.text, fontWeight: '800' },

    tabs: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: c.border },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: c.text },
    tabText: { fontWeight: '900', color: c.text },
    tabTextActive: { color: c.background },

    empty: { color: c.textMuted, textAlign: 'center', marginTop: 18 },

    rowCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    rowTitle: { fontWeight: '900', color: c.text },
    rowMeta: { marginTop: 2, color: c.textMuted, fontSize: 12 },
    rowAmount: { fontWeight: '900' },
    amountPlus: { color: c.success },
    amountMinus: { color: c.danger },
  });
}
