import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

function fmtCurrency(v) {
  return `R${(Number(v) || 0).toFixed(2)}`;
}

function fmtTime(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function OwnerEarningsDetailScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(() => {
    if (route.params?.date) {
      const d = new Date(route.params.date);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [expandedVehicle, setExpandedVehicle] = useState(null);

  const dateStr = selectedDate.toISOString().split('T')[0];
  const isToday = dateStr === new Date().toISOString().split('T')[0];

  function shiftDate(days) {
    setLoading(true);
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  }

  const load = useCallback(async () => {
    const tenantId = user?.tenantId;
    if (!tenantId) { setLoading(false); setRefreshing(false); return; }
    try {
      const resp = await client.get(`/TaxiRankTrips/owner/daily?tenantId=${tenantId}&date=${dateStr}`);
      const result = resp.data;
      // Sort vehicles by earnings descending
      const sorted = [...(result?.vehicles || [])].sort((a, b) => b.totalEarnings - a.totalEarnings);
      setData({ ...result, vehicles: sorted });
      // Auto-expand first vehicle with trips
      const first = sorted.find(v => v.tripCount > 0);
      if (first) setExpandedVehicle(ev => ev || first.vehicle?.id);
    } catch (e) {
      console.warn('Failed to load owner daily earnings:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr, user?.tenantId]);

  useEffect(() => { load(); }, [load]);

  const vehicles = data?.vehicles || [];
  const totalEarnings = data?.totalEarnings ?? 0;
  const activeVehicles = vehicles.filter(v => v.tripCount > 0).length;
  const totalTrips = vehicles.reduce((sum, v) => sum + v.tripCount, 0);

  const dateLabel = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Daily Earnings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Date Navigator */}
      <View style={s.dateNav}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={s.dateNavBtn}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={s.dateNavCenter}>
          <Ionicons name="calendar-outline" size={14} color={c.primary} />
          <Text style={s.dateNavTxt}>{dateLabel}</Text>
          {!isToday && (
            <TouchableOpacity onPress={() => {
              setLoading(true);
              setSelectedDate(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
            }}>
              <Text style={s.dateNavBack}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => shiftDate(1)} style={s.dateNavBtn}>
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[s.mutedTxt, { marginTop: 12 }]}>Loading earnings…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {/* Summary cards */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderLeftColor: '#10b981' }]}>
              <Text style={s.summaryNum}>{fmtCurrency(totalEarnings)}</Text>
              <Text style={s.summaryLabel}>Total Earnings</Text>
            </View>
            <View style={[s.summaryCard, { borderLeftColor: '#3b82f6' }]}>
              <Text style={s.summaryNum}>{activeVehicles}</Text>
              <Text style={s.summaryLabel}>Active Vehicles</Text>
            </View>
            <View style={[s.summaryCard, { borderLeftColor: '#f59e0b' }]}>
              <Text style={s.summaryNum}>{totalTrips}</Text>
              <Text style={s.summaryLabel}>Trips</Text>
            </View>
          </View>

          {vehicles.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="cash-outline" size={48} color={c.textMuted} />
              <Text style={s.emptyTitle}>No vehicles found</Text>
              <Text style={s.mutedTxt}>No vehicles are registered under your fleet.</Text>
            </View>
          ) : (
            vehicles.map(row => {
              const v = row.vehicle || {};
              const trips = Array.isArray(row.trips) ? row.trips : [];
              const isExpanded = expandedVehicle === v.id;
              const hasTrips = row.tripCount > 0;

              return (
                <View key={v.id} style={s.vehicleCard}>
                  <TouchableOpacity
                    style={s.vehicleHeader}
                    onPress={() => setExpandedVehicle(isExpanded ? null : v.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.vehicleIcon, { backgroundColor: hasTrips ? '#10b98115' : c.surface2 }]}>
                      <Ionicons name="car-sport-outline" size={18} color={hasTrips ? '#10b981' : c.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.vehicleReg}>{v.registration || 'Unknown'}</Text>
                      <Text style={s.vehicleMeta}>
                        {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                        {hasTrips ? ` · ${row.tripCount} trip${row.tripCount > 1 ? 's' : ''}` : ''}
                      </Text>
                    </View>
                    <View style={[s.earningsBadge, { backgroundColor: hasTrips ? '#10b98115' : c.surface2 }]}>
                      <Text style={[s.earningsBadgeTxt, { color: hasTrips ? '#10b981' : c.textMuted }]}>
                        {fmtCurrency(row.totalEarnings)}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16} color={c.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={s.itemsList}>
                      {trips.length === 0 ? (
                        <Text style={s.noRecordsTxt}>No trips recorded for this date</Text>
                      ) : (
                        trips.map((trip, idx) => (
                          <View key={trip.id || idx} style={s.earningItem}>
                            <View style={[s.earningDot, { backgroundColor: trip.totalAmount > 0 ? '#10b981' : '#94a3b8' }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.earningDesc}>
                                {trip.departureStation} → {trip.destinationStation}
                              </Text>
                              <Text style={s.earningTime}>
                                {fmtTime(trip.departureTime)}{trip.passengerCount > 0 ? ` · ${trip.passengerCount} pax` : ''} · {trip.status}
                              </Text>
                            </View>
                            <Text style={s.earningAmt}>{fmtCurrency(trip.totalAmount)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' },

    dateNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 8, paddingVertical: 10,
      backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    dateNavBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    dateNavCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateNavTxt: { fontSize: 14, fontWeight: '700', color: c.text },
    dateNavBack: { fontSize: 11, color: c.primary, marginLeft: 6 },

    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    summaryCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12,
      borderLeftWidth: 3, elevation: 1,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    summaryNum: { fontSize: 14, fontWeight: '800', color: c.text },
    summaryLabel: { fontSize: 10, color: c.textMuted, marginTop: 2 },

    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 12, marginBottom: 4 },
    mutedTxt: { fontSize: 13, color: c.textMuted, textAlign: 'center' },

    vehicleCard: {
      backgroundColor: c.surface, borderRadius: 14, marginBottom: 12,
      overflow: 'hidden', elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    vehicleHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    vehicleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    vehicleReg: { fontSize: 14, fontWeight: '700', color: c.text },
    vehicleMeta: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    earningsBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    earningsBadgeTxt: { fontSize: 13, fontWeight: '800' },

    itemsList: { borderTopWidth: 1, borderTopColor: c.border },
    earningItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, gap: 10,
    },
    earningDot: { width: 8, height: 8, borderRadius: 4 },
    earningDesc: { fontSize: 13, color: c.text, fontWeight: '500' },
    earningTime: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    earningAmt: { fontSize: 14, fontWeight: '800', color: '#10b981' },
    noRecordsTxt: { fontSize: 12, color: c.textMuted, textAlign: 'center', paddingVertical: 14 },
  });
}
