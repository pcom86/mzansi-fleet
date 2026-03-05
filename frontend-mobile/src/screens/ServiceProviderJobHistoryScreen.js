import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { getMyProviderBookings } from '../api/maintenance';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Jobs' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Scheduled: '#3b82f6',
  Accepted: '#8b5cf6',
  InProgress: '#f59e0b',
  Completed: '#22c55e',
  Declined: '#ef4444',
};

function toDateKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(dt) {
  const d = new Date(dt);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function endOfWeek(dt) {
  const d = startOfWeek(new Date(dt));
  d.setDate(d.getDate() + 6);
  return d;
}

function startOfMonth(dt) {
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function endOfMonth(dt) {
  return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
}

export default function ServiceProviderJobHistoryScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyProviderBookings();
      console.log('Job History Data:', data);
      setBookings(data || []);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load job history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedFilter) {
      case 'today':
        return bookings.filter(b => {
          const date = new Date(b.scheduledDate || b.scheduledAt || b.createdAt || Date.now());
          return toDateKey(date) === toDateKey(today);
        });
      
      case 'week':
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        return bookings.filter(b => {
          const date = new Date(b.scheduledDate || b.scheduledAt || b.createdAt || Date.now());
          return date >= weekStart && date <= weekEnd;
        });
      
      case 'month':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return bookings.filter(b => {
          const date = new Date(b.scheduledDate || b.scheduledAt || b.createdAt || Date.now());
          return date >= monthStart && date <= monthEnd;
        });
      
      case 'custom':
        if (!customStart || !customEnd) return bookings;
        return bookings.filter(b => {
          const date = new Date(b.scheduledDate || b.scheduledAt || b.createdAt || Date.now());
          return date >= customStart && date <= customEnd;
        });
      
      default:
        return bookings;
    }
  }, [bookings, selectedFilter, customStart, customEnd]);

  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const completed = filteredBookings.filter(b => b.state === 'Completed').length;
    const earnings = filteredBookings
      .filter(b => b.state === 'Completed')
      .reduce((sum, b) => {
        const cost = b.serviceCost || b.ServiceCost || b.repairCost || 0;
        console.log('Booking cost for', b.id, ':', cost);
        return sum + (cost || 0);
      }, 0);
    
    return { total, completed, earnings };
  }, [filteredBookings]);

  function renderBooking({ item }) {
    const date = new Date(item.scheduledDate || item.scheduledAt || item.createdAt || Date.now());
    const statusColor = STATUS_COLORS[item.state] || c.textMuted;
    
    return (
      <View style={[styles.bookingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.bookingHeader}>
          <Text style={[styles.bookingCategory, { color: c.text }]}>{item.category}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.state}</Text>
          </View>
        </View>
        
        <Text style={[styles.bookingDesc, { color: c.text }]}>{item.description || 'No description'}</Text>
        
        <View style={styles.bookingMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textMuted }]}>
              {date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          
          {(item.scheduledDate || item.scheduledAt) && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textMuted }]}>
                {date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          
          {item.vehicleRegistration && (
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={14} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textMuted }]}>{item.vehicleRegistration}</Text>
            </View>
          )}
        </View>
        
        {item.state === 'Completed' && (item.serviceCost || item.ServiceCost || item.repairCost) && (
          <View style={styles.earningRow}>
            <Ionicons name="cash-outline" size={14} color="#22c55e" />
            <Text style={[styles.earningText, { color: '#22c55e' }]}>
              R {(item.serviceCost || item.ServiceCost || item.repairCost || 0).toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading job history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.headerTitle}>Job History</Text>
        <Text style={styles.headerSub}>Your completed and scheduled jobs</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.statValue, { color: c.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Total Jobs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>R{stats.earnings.toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Earnings</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTER_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterTab,
              { backgroundColor: c.surface, borderColor: c.border },
              selectedFilter === option.key && { backgroundColor: c.primary, borderColor: c.primary }
            ]}
            onPress={() => setSelectedFilter(option.key)}
          >
            <Text style={[
              styles.filterTabText,
              { color: c.textMuted },
              selectedFilter === option.key && { color: '#fff' }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No Jobs Found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              {selectedFilter === 'all' ? "You haven't had any jobs yet" : "No jobs found in this period"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#ffffffcc' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  filterScroll: { paddingHorizontal: 16, marginBottom: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterTabText: { fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  bookingCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingCategory: { fontSize: 15, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  bookingDesc: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  bookingMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  earningText: { fontSize: 14, fontWeight: '700' },
  empty: { borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  loadingText: { marginTop: 12, fontSize: 14 },
});
