import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, FlatList, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, StackedBarChart } from 'react-native-chart-kit';

// helper for pie chart data with zero fallback
function buildPieData(earnings, expenses) {
  const e = Number(earnings) || 0;
  const x = Number(expenses) || 0;
  const p = e - x;
  if (e === 0 && x === 0) {
    return [{ name: 'None', amount: 1, color: '#ccc', legendFontColor: '#666', legendFontSize: 10 }];
  }
  const arr = [];
  if (e > 0) arr.push({ name: 'Earnings', amount: e, color: '#059669', legendFontColor: '#000', legendFontSize: 10 });
  if (x > 0) arr.push({ name: 'Expenses', amount: x, color: '#dc2626', legendFontColor: '#000', legendFontSize: 10 });
  if (p !== 0) {
    arr.push({
      name: p >= 0 ? 'Profit' : 'Loss',
      amount: Math.abs(p),
      color: p >= 0 ? '#374151' : '#991b1b',
      legendFontColor: '#000',
      legendFontSize: 10
    });
  }
  return arr;
}
import { useAuth } from '../context/AuthContext';
import { getRecentTenders, getAllTenders } from '../api/tenders';
import { getAllVehicles } from '../api/vehicles';
import { approveMechanicalRequest, completeMechanicalRequest, declineMechanicalRequest, deleteMechanicalRequest, getMechanicalRequests } from '../api/maintenance';
import { getUnreadCount } from '../api/messaging';
import { getCurrentMonthRange, getOwnerAnalyticsDashboard } from '../api/analytics';
import { useAppTheme } from '../theme';

function stateColor(state) {
  switch ((state || '').toLowerCase()) {
    case 'pending': return '#f59e0b';
    case 'approved': return '#3b82f6';
    case 'scheduled': return '#8b5cf6';
    case 'completed': return '#22c55e';
    case 'declined': return '#ef4444';
    default: return '#9ca3af';
  }
}

export default function OwnerDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const chartConfig = useMemo(() => {
    const textRgb = mode === 'dark' ? '229,231,235' : '15,23,42';
    return {
      backgroundGradientFrom: c.surface,
      backgroundGradientFromOpacity: 0,
      backgroundGradientTo: c.surface,
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) => `rgba(${textRgb}, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
    };
  }, [c.surface, mode]);
  const [loading, setLoading] = useState(true);
  const [recentTenders, setRecentTenders] = useState([]);
  const [allTenders, setAllTenders] = useState([]);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [maintenanceTomorrow, setMaintenanceTomorrow] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [analytics, setAnalytics] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [requestsBusy, setRequestsBusy] = useState(false);
  const [requestsPage, setRequestsPage] = useState(1);

  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  async function logout() {
    try { await signOut(); } catch {}
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }

  const [tab, setTab] = useState('overview');

  useEffect(() => {
    navigation.setOptions({ title: 'Mzansi Fleet', headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    let mounted = true;
    try {
      setLoading(true);
      const [recent, all, vehicles, mechRequests, unread, analyticsData] = await Promise.all([
          getRecentTenders(7),
          getAllTenders(),
          getAllVehicles(),
          getMechanicalRequests(),
          getUnreadCount(user?.id || user?.userId),
          getOwnerAnalyticsDashboard(user?.tenantId, monthRange.startDate, monthRange.endDate)
        ]);

        if (!mounted) return;
        setRecentTenders(recent.slice(0, 3));
        setAllTenders(all || []);
        const ownerVehicles = (vehicles || []).filter(v => v.ownerId === user?.tenantId || v.ownerId === user?.id || v.ownerId === user?.userId);
        setVehiclesCount(ownerVehicles.length);

        setAnalytics(analyticsData);

        // Count maintenance scheduled for tomorrow similar to web logic
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0,0,0,0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const ownerVehicleIds = new Set(ownerVehicles.map(v => v.id));
        const ownerRequests = (mechRequests || []).filter(r => ownerVehicleIds.has(r.vehicleId));

        // Keep maintenance requests list for owner vehicles
        const enrichedRequests = ownerRequests
          .map(r => {
            const v = ownerVehicles.find(ov => ov.id === r.vehicleId);
            return {
              ...r,
              issueDescription: r.issueDescription || r.description || r.Description,
              vehicleRegistration: v?.registration,
              vehicleMake: v?.make,
              vehicleModel: v?.model,
              requestedDate: r.createdAt || r.requestedDate
            };
          })
          .sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
        setMaintenanceRequests(enrichedRequests);
        setRequestsPage(1);

        const countTomorrow = ownerRequests.filter(r => {
          if (!r.scheduledDate) return false;
          const d = new Date(r.scheduledDate);
          d.setHours(0,0,0,0);
          return d >= tomorrow && d < dayAfter && (r.state === 'Scheduled' || r.status === 'Scheduled');
        }).length;

        setMaintenanceTomorrow(countTomorrow);
        setUnreadMessages(unread || 0);
      } catch (err) {
        console.warn('Error loading owner dashboard data', err);
      } finally {
        if (mounted) setLoading(false);
      }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  function currency(value) {
    const num = Number(value) || 0;
    return `R${num.toFixed(2)}`;
  }

  const screenWidth = Dimensions.get('window').width - 32;

  const vehicleChartData = useMemo(() => {
    const vp = analytics?.vehiclePerformance || [];
    if (!vp.length) return null;

    const labels = vp.map(v => String(v.registration || 'Vehicle'));
    const data = vp.map(v => {
      const earnings = Math.max(0, Number(v.earnings) || 0);
      const expenses = Math.max(0, Number(v.expenses) || 0);
      const profit = Math.max(0, earnings - expenses);
      // StackedBarChart cannot render negative or all-zero rows – ensure at least a tiny value
      if (earnings === 0 && expenses === 0 && profit === 0) return [0.01, 0, 0];
      return [earnings, expenses, profit];
    });
    return {
      labels,
      legend: ['Earnings', 'Expenses', 'Profit'],
      data,
      // Use lighter colors so the chart's value labels (rendered on top of bars) stay readable
      barColors: ['#10b981', '#f87171', '#d1d5db'],
    };
  }, [analytics]);

  const vehicleChartWidth = useMemo(() => {
    const count = analytics?.vehiclePerformance?.length || 0;
    // Allocate enough room for each label so it doesn't clip
    return Math.max(screenWidth, count * 80);
  }, [analytics, screenWidth]);

  const vehiclePerfRows = useMemo(() => {
    const vp = analytics?.vehiclePerformance || [];
    return vp.map(v => {
      const e = Number(v.earnings) || 0;
      const x = Number(v.expenses) || 0;
      const p = e - x;
      return {
        id: v.id || v.vehicleId || `${v.registration || ''}-${v.make || ''}-${v.model || ''}`,
        label: v.registration || 'Vehicle',
        earnings: e,
        expenses: x,
        profit: p,
      };
    });
  }, [analytics]);

  const maintenancePageSize = 5;
  const maintenanceTotalPages = useMemo(() => {
    const total = maintenanceRequests.length;
    return Math.max(1, Math.ceil(total / maintenancePageSize));
  }, [maintenanceRequests.length]);

  const pagedMaintenanceRequests = useMemo(() => {
    const page = Math.min(Math.max(1, requestsPage), maintenanceTotalPages);
    const start = (page - 1) * maintenancePageSize;
    return maintenanceRequests.slice(start, start + maintenancePageSize);
  }, [maintenanceRequests, maintenanceTotalPages, requestsPage]);

  async function onApproveRequest(id) {
    try {
      setRequestsBusy(true);
      await approveMechanicalRequest(id);
      setMaintenanceRequests(prev => prev.map(r => (r.id === id ? { ...r, state: 'Approved' } : r)));
    } catch (e) {
      Alert.alert('Error', 'Failed to approve request');
    } finally {
      setRequestsBusy(false);
    }
  }

  async function onDeclineRequest(id) {
    let reason = '';
    if (Platform.OS === 'web') {
      reason = window.prompt('Reason for declining (optional):') || '';
      if (reason === null) return;
    } else {
      const confirmed = await new Promise(resolve =>
        Alert.alert('Decline Request', 'Are you sure you want to decline this request?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Decline', style: 'destructive', onPress: () => resolve('Declined by owner') },
        ])
      );
      if (confirmed === null) return;
      reason = confirmed;
    }
    try {
      setRequestsBusy(true);
      await declineMechanicalRequest(id, reason || 'Declined by owner');
      setMaintenanceRequests(prev => prev.map(r => (r.id === id ? { ...r, state: 'Declined' } : r)));
    } catch (e) {
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setRequestsBusy(false);
    }
  }

  async function onDeleteRequest(id) {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this maintenance request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setRequestsBusy(true);
              await deleteMechanicalRequest(id);
              setMaintenanceRequests(prev => prev.filter(r => r.id !== id));
              Alert.alert('Deleted', 'Maintenance request has been deleted');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete request');
            } finally {
              setRequestsBusy(false);
            }
          }
        }
      ]
    );
  }

  async function onCompleteRequest(id) {
    const req = maintenanceRequests.find(r => r.id === id);
    navigation.navigate('OwnerMaintenanceRequestDetails', { request: req || { id } });
  }

  function openTender(tender) {
    // if there's a tender details screen, navigate there; placeholder for now
    Alert.alert(tender.title || 'Tender', tender.description || 'No description');
  }

  function applyToTender(tender) {
    // navigate to an apply screen if exists
    navigation.navigate('OwnerTenders', { tenderId: tender.id });
  }

  const pendingMaint = maintenanceRequests.filter(r => r.state === 'Pending').length;

  const TABS = [
    { key: 'overview',     label: 'Overview',     icon: 'grid-outline',        activeIcon: 'grid' },
    { key: 'maintenance',  label: 'Maintenance',  icon: 'construct-outline',   activeIcon: 'construct', badge: pendingMaint },
    { key: 'vehicles',     label: 'Vehicles',     icon: 'car-outline',         activeIcon: 'car' },
    { key: 'messages',     label: 'Messages',     icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', badge: unreadMessages },
    { key: 'profile',      label: 'Profile',      icon: 'person-outline',      activeIcon: 'person' },
  ];

  function renderMaintenanceCard(item) {
    const col = stateColor(item.state);
    return (
      <TouchableOpacity key={item.id} activeOpacity={0.8} onPress={() => navigation.navigate('OwnerMaintenanceRequestDetails', { request: item })}>
        <View style={[styles.requestCard, { borderLeftColor: col, borderLeftWidth: 4 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={[styles.reqIconWrap, { backgroundColor: col + '20' }]}>
              <Ionicons name="construct-outline" size={16} color={col} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.requestTitle}>{item.vehicleRegistration || 'Vehicle'} · {item.category || 'Maintenance'}</Text>
              <Text style={styles.requestBody} numberOfLines={1}>{item.issueDescription || item.description || 'No description'}</Text>
            </View>
            <View style={[styles.stateBadge, { backgroundColor: col + '18', borderColor: col }]}>
              <Text style={[styles.stateBadgeTxt, { color: col }]}>{item.state || 'Open'}</Text>
            </View>
          </View>
          {item.scheduledDate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="calendar-outline" size={12} color={c.primary} />
              <Text style={[styles.requestMeta, { marginLeft: 4, color: c.primary }]}>Scheduled: {new Date(item.scheduledDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(item.scheduledDate).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ) : null}
          {item.preferredTime && !item.scheduledDate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="time-outline" size={12} color={c.textMuted} />
              <Text style={[styles.requestMeta, { marginLeft: 4 }]}>Preferred: {new Date(item.preferredTime).toLocaleDateString()}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {item.state === 'Pending' ? (
              <>
                <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnGreen} onPress={(e) => { e.stopPropagation?.(); onApproveRequest(item.id); }}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnRed} onPress={(e) => { e.stopPropagation?.(); onDeclineRequest(item.id); }}>
                  <Ionicons name="close" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnGray} onPress={(e) => { e.stopPropagation?.(); onDeleteRequest(item.id); }}>
                  <Ionicons name="trash" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : item.state === 'Approved' ? (
              <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnBlue} onPress={(e) => { e.stopPropagation?.(); navigation.navigate('OwnerBookService', { request: item }); }}>
                <Ionicons name="calendar-outline" size={14} color="#fff" />
                <Text style={styles.actionBtnTxt}>Schedule</Text>
              </TouchableOpacity>
            ) : item.state === 'Scheduled' ? (
              <>
                <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnGreen} onPress={(e) => { e.stopPropagation?.(); onCompleteRequest(item.id); }}>
                  <Ionicons name="checkmark-done" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={requestsBusy} style={styles.actionBtnBlue} onPress={(e) => { e.stopPropagation?.(); navigation.navigate('OwnerMaintenanceRequestDetails', { request: item }); }}>
                  <Ionicons name="create-outline" size={14} color="#fff" />
                  <Text style={styles.actionBtnTxt}>Edit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.requestMeta}>View details</Text>
                <Ionicons name="chevron-forward" size={12} color={c.textMuted} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.subhead, { marginTop: 12 }]}>Loading dashboard…</Text>
    </View>
  );

  const initials = (user?.fullName || 'O').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerAvatar} onPress={() => setTab('profile')}>
          <Text style={styles.headerAvatarTxt}>{initials}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.greeting}>Hello, {user?.fullName?.split(' ')[0] || 'Owner'} 👋</Text>
          <Text style={styles.subhead}>Owner Portal · This Month</Text>
        </View>
        <TouchableOpacity style={styles.headerNotifBtn} onPress={() => setTab('messages')}>
          <Ionicons name="notifications-outline" size={20} color={unreadMessages > 0 ? c.primary : c.textMuted} />
          {unreadMessages > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Tab content ── */}
      <View style={{ flex: 1 }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

            {/* Hero profit card */}
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Total Profit</Text>
                <Text style={styles.heroValue}>{currency(analytics?.totalProfit)}</Text>
                <Text style={styles.heroSub}>This month · {analytics?.totalVehicles ?? vehiclesCount} vehicles</Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="trending-up" size={32} color="#fff" />
              </View>
            </View>

            {/* 2-col metric grid */}
            <View style={styles.metricsGrid}>
              {[
                { icon: 'arrow-up-circle-outline', color: '#10b981', label: 'Earnings',        value: currency(analytics?.totalEarnings) },
                { icon: 'arrow-down-circle-outline', color: '#ef4444', label: 'Expenses',       value: currency(analytics?.totalExpenses) },
                { icon: 'construct-outline',        color: '#f59e0b', label: 'Pending Maint.',  value: String(pendingMaint) },
                { icon: 'car-sport-outline',        color: '#3b82f6', label: 'Fleet Size',      value: String(analytics?.totalVehicles ?? vehiclesCount) },
                { icon: 'calendar-outline',         color: '#8b5cf6', label: 'Maint. Tomorrow', value: String(maintenanceTomorrow) },
                { icon: 'chatbubbles-outline',      color: '#06b6d4', label: 'Unread Messages', value: String(unreadMessages) },
              ].map(m => (
                <View key={m.label} style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: m.color + '20' }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.sectionTitle}>Fleet Earnings vs Expenses</Text>
                <Text style={styles.sectionSubTitle}>This Month</Text>
              </View>
              <View style={styles.legendRow}>
                {[['#10b981','Earnings'],['#f87171','Expenses'],['#d1d5db','Profit']].map(([col, lbl]) => (
                  <View key={lbl} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: col }]} />
                    <Text style={styles.legendText}>{lbl}</Text>
                  </View>
                ))}
              </View>
              {vehicleChartData ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                  <StackedBarChart
                    data={vehicleChartData} width={vehicleChartWidth} height={240} yAxisLabel="R"
                    fromZero withInnerLines segments={4}
                    chartConfig={{ ...chartConfig, color: () => '#111827', decimalPlaces: 0,
                      formatYLabel: y => { const n = Number(y); return Number.isFinite(n) ? String(Math.round(n)) : String(y); },
                      propsForLabels: { fontSize: 9 }, propsForBackgroundLines: { stroke: '#e5e7eb', strokeDasharray: '0' } }}
                    style={styles.chart}
                  />
                </ScrollView>
              ) : <Text style={styles.empty}>No chart data yet</Text>}

              {vehiclePerfRows.length > 0 && (
                <View style={styles.breakdownWrap}>
                  <Text style={styles.breakdownTitle}>Per Vehicle</Text>
                  {vehiclePerfRows.slice(0, 6).map(r => (
                    <View key={r.id} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{r.label}</Text>
                      <Text style={styles.breakdownE}>+{currency(r.earnings)}</Text>
                      <Text style={styles.breakdownX}>-{currency(r.expenses)}</Text>
                      <Text style={[styles.breakdownP, { color: r.profit >= 0 ? '#059669' : '#dc2626' }]}>
                        {r.profit >= 0 ? '+' : '-'}{currency(Math.abs(r.profit))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Tenders */}
            {recentTenders.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Tenders</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('OwnerTenders')}>
                    <Text style={styles.sectionLink}>See all</Text>
                  </TouchableOpacity>
                </View>
                {recentTenders.map(item => (
                  <View key={item.id || item.tenderId} style={styles.tenderCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.tenderIconWrap}>
                        <Ionicons name="document-text-outline" size={20} color={c.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.tenderTitle}>{item.title}</Text>
                        <Text style={styles.tenderMeta}>{item.publisherName || ''}{item.budgetMax ? ` · R${item.budgetMax}` : ''}</Text>
                      </View>
                      <TouchableOpacity style={styles.tenderApplyBtn} onPress={() => applyToTender(item)}>
                        <Text style={styles.tenderApplyTxt}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* ── MAINTENANCE ── */}
        {tab === 'maintenance' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Maintenance Requests</Text>
              <TouchableOpacity
                style={[styles.newRequestBtn, { backgroundColor: c.primary }]}
                onPress={() => navigation.navigate('OwnerNewMaintenanceRequest')}
              >
                <Ionicons name="add" size={15} color="#fff" />
                <Text style={styles.newRequestBtnTxt}>New Request</Text>
              </TouchableOpacity>
            </View>
            {pendingMaint > 0 && (
              <View style={[styles.stateBadge, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b', alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[styles.stateBadgeTxt, { color: '#f59e0b' }]}>{pendingMaint} pending</Text>
              </View>
            )}
            {maintenanceRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="construct-outline" size={48} color={c.textMuted} />
                <Text style={styles.emptyTitle}>No Requests</Text>
                <Text style={styles.emptyTxt}>All clear — no maintenance requests</Text>
              </View>
            ) : (
              <>
                <View style={styles.paginationRow}>
                  <TouchableOpacity disabled={requestsPage <= 1} style={[styles.pageBtn, requestsPage <= 1 && styles.pageBtnDisabled]} onPress={() => setRequestsPage(p => Math.max(1, p - 1))}>
                    <Ionicons name="chevron-back" size={16} color={requestsPage <= 1 ? c.textMuted : c.primary} />
                  </TouchableOpacity>
                  <Text style={styles.paginationText}>{Math.min(requestsPage, maintenanceTotalPages)} / {maintenanceTotalPages}</Text>
                  <TouchableOpacity disabled={requestsPage >= maintenanceTotalPages} style={[styles.pageBtn, requestsPage >= maintenanceTotalPages && styles.pageBtnDisabled]} onPress={() => setRequestsPage(p => Math.min(maintenanceTotalPages, p + 1))}>
                    <Ionicons name="chevron-forward" size={16} color={requestsPage >= maintenanceTotalPages ? c.textMuted : c.primary} />
                  </TouchableOpacity>
                </View>
                {pagedMaintenanceRequests.map(item => renderMaintenanceCard(item))}
              </>
            )}
          </ScrollView>
        )}

        {/* ── VEHICLES ── */}
        {tab === 'vehicles' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Quick action buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OwnerVehicles')}>
                <View style={[styles.quickActionIcon, { backgroundColor: c.primary + '20' }]}>
                  <Ionicons name="speedometer-outline" size={22} color={c.primary} />
                </View>
                <Text style={styles.quickActionTxt}>Fleet Performance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OwnerBookService')}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e20' }]}>
                  <Ionicons name="construct-outline" size={22} color="#22c55e" />
                </View>
                <Text style={styles.quickActionTxt}>Book Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OwnerVehicles')}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
                  <Ionicons name="car-outline" size={22} color="#3b82f6" />
                </View>
                <Text style={styles.quickActionTxt}>My Fleet</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Vehicle Performance</Text>
            {analytics?.vehiclePerformance?.length ? analytics.vehiclePerformance.map(item => {
              const health = Number(item.healthScore) || 0;
              const healthColor = health >= 70 ? '#22c55e' : health >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.8} onPress={() => navigation.navigate('VehiclePerformance', { vehicle: item })}>
                  <View style={styles.vehicleCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={styles.vehicleIconWrap}>
                        <Ionicons name="car-sport-outline" size={22} color={c.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
                        <Text style={styles.vehicleReg}>{item.registration}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={[styles.statusDot, { backgroundColor: item.isInService ? '#22c55e' : '#9ca3af' }]} />
                          <Text style={styles.vehicleMeta}>{item.status || 'Unknown'}{item.isInService ? ' · In Service' : ''}</Text>
                        </View>
                      </View>
                      <View style={styles.pieWrap}>
                        <PieChart data={buildPieData(item.earnings, item.expenses)} width={96} height={96} chartConfig={chartConfig} accessor="amount" backgroundColor="transparent" paddingLeft="14" hasLegend={false} />
                      </View>
                    </View>

                    {/* Health bar */}
                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.healthLabel}>Health Score</Text>
                        <Text style={[styles.healthPct, { color: healthColor }]}>{health}%</Text>
                      </View>
                      <View style={styles.healthBar}>
                        <View style={[styles.healthBarFill, { width: `${health}%`, backgroundColor: healthColor }]} />
                      </View>
                    </View>

                    {/* Financial row */}
                    <View style={styles.vehicleFinRow}>
                      <View style={styles.vehicleFinItem}>
                        <Text style={styles.vehicleFinLabel}>Earnings</Text>
                        <Text style={styles.vehicleFinEarnings}>+{currency(item.earnings)}</Text>
                      </View>
                      <View style={[styles.vehicleFinItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.border }]}>
                        <Text style={styles.vehicleFinLabel}>Expenses</Text>
                        <Text style={styles.vehicleFinExpenses}>-{currency(item.expenses)}</Text>
                      </View>
                      <View style={styles.vehicleFinItem}>
                        <Text style={styles.vehicleFinLabel}>Profit</Text>
                        <Text style={[styles.vehicleFinProfit, { color: (item.profit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                          {(Number(item.profit) || 0) >= 0 ? '+' : '-'}{currency(Math.abs(Number(item.profit) || 0))}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={48} color={c.textMuted} />
                <Text style={styles.emptyTitle}>No Vehicles</Text>
                <Text style={styles.emptyTxt}>Add vehicles to see performance</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {unreadMessages > 0 && (
              <View style={styles.unreadBanner}>
                <Ionicons name="mail-unread-outline" size={18} color="#92400e" />
                <Text style={styles.unreadBannerTxt}>{unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</Text>
              </View>
            )}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OwnerMessages')}>
                <View style={[styles.quickActionIcon, { backgroundColor: c.primary + '20' }]}>
                  <Ionicons name="mail-outline" size={22} color={c.primary} />
                </View>
                <Text style={styles.quickActionTxt}>Open Inbox</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OwnerComposeMessage')}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#10b98120' }]}>
                  <Ionicons name="create-outline" size={22} color="#10b981" />
                </View>
                <Text style={styles.quickActionTxt}>Compose</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Avatar card */}
            <View style={styles.profHeader}>
              <View style={styles.profAvatar}>
                <Text style={styles.profAvatarTxt}>{initials}</Text>
              </View>
              <Text style={styles.profName}>{user?.fullName || 'Owner'}</Text>
              <Text style={styles.profEmail}>{user?.email || ''}</Text>
              <View style={styles.profBadge}>
                <Ionicons name="business-outline" size={12} color={c.primary} />
                <Text style={styles.profBadgeTxt}>{vehiclesCount} vehicle fleet</Text>
              </View>
            </View>

            {/* Action rows */}
            <Text style={styles.profGroupLabel}>FLEET</Text>
            {[
              { icon: 'car-outline',          color: '#3b82f6', label: 'My Vehicles',        screen: 'OwnerVehicles' },
              { icon: 'document-text-outline', color: '#8b5cf6', label: 'Tenders',            screen: 'OwnerTenders' },
              { icon: 'storefront-outline',   color: '#10b981', label: 'Rental Marketplace', screen: 'RentalMarketplace' },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.profActionRow} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.profActionIcon, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={20} color={a.color} />
                </View>
                <Text style={styles.profActionTxt}>{a.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </TouchableOpacity>
            ))}

            <Text style={[styles.profGroupLabel, { marginTop: 16 }]}>COMMUNICATION</Text>
            <TouchableOpacity style={styles.profActionRow} onPress={() => navigation.navigate('OwnerMessages')}>
              <View style={[styles.profActionIcon, { backgroundColor: '#06b6d420' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#06b6d4" />
              </View>
              <Text style={styles.profActionTxt}>Messages</Text>
              {unreadMessages > 0 && <View style={[styles.tabBadge, { position: 'relative', top: 0, right: 0, marginRight: 8 }]}><Text style={styles.tabBadgeTxt}>{unreadMessages}</Text></View>}
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.profGroupLabel, { marginTop: 16 }]}>PREFERENCES</Text>
            <TouchableOpacity style={styles.profActionRow} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
              <View style={[styles.profActionIcon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color="#f59e0b" />
              </View>
              <Text style={styles.profActionTxt}>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutTxt}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <View>
              <Ionicons name={tab === t.key ? t.activeIcon : t.icon} size={22} color={tab === t.key ? c.primary : c.textMuted} />
              {t.badge > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeTxt}>{t.badge > 9 ? '9+' : t.badge}</Text></View>
              )}
            </View>
            <Text style={[styles.tabLbl, tab === t.key && { color: c.primary, fontWeight: '800' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // ── Header ──
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    headerAvatarTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
    greeting: { fontSize: 16, fontWeight: '800', color: c.text },
    subhead: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    headerNotifBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    notifDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },

    // ── Bottom tab bar ──
    tabBar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    tabItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44, justifyContent: 'center' },
    tabLbl: { fontSize: 10, fontWeight: '600', color: c.textMuted },
    tabBadge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

    // ── Overview ──
    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, borderRadius: 20, padding: 20, marginBottom: 16 },
    heroLabel: { fontSize: 12, color: '#ffffff99', fontWeight: '600', marginBottom: 4 },
    heroValue: { fontSize: 30, fontWeight: '900', color: '#fff' },
    heroSub: { fontSize: 12, color: '#ffffffaa', marginTop: 4 },
    heroIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    metricCard: { width: '47%', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    metricValue: { fontSize: 18, fontWeight: '800', color: c.text },
    metricLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '500' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    sectionSubTitle: { fontSize: 11, color: c.textMuted },
    sectionLink: { fontSize: 13, color: c.primary, fontWeight: '700' },
    newRequestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    newRequestBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

    empty: { color: c.textMuted, marginBottom: 8, fontSize: 13 },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12 },
    emptyTxt: { fontSize: 13, color: c.textMuted, marginTop: 4 },

    // ── Chart ──
    chartCard: { backgroundColor: c.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
    chart: { borderRadius: 12, alignSelf: 'center' },
    legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 12, color: c.text, fontWeight: '600' },
    breakdownWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
    breakdownTitle: { fontSize: 13, fontWeight: '800', color: c.text, marginBottom: 8 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    breakdownLabel: { flex: 1.4, fontSize: 12, fontWeight: '600', color: c.text },
    breakdownE: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#10b981' },
    breakdownX: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#ef4444' },
    breakdownP: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '800' },

    // ── Tenders ──
    tenderCard: { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    tenderIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
    tenderTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    tenderMeta: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    tenderApplyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: c.primary },
    tenderApplyTxt: { fontSize: 12, fontWeight: '800', color: c.primaryText },

    // ── Maintenance cards ──
    requestCard: { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    reqIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    requestTitle: { fontSize: 13, fontWeight: '800', color: c.text },
    requestBody: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    requestMeta: { fontSize: 11, color: c.textMuted },
    stateBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    stateBadgeTxt: { fontSize: 10, fontWeight: '800' },
    actionBtnGreen: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#22c55e' },
    actionBtnRed: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#ef4444' },
    actionBtnBlue: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#3b82f6' },
    actionBtnGray: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#6b7280' },
    actionBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },

    // ── Pagination ──
    paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    pageBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    pageBtnDisabled: { opacity: 0.35 },
    paginationText: { fontSize: 13, color: c.textMuted, fontWeight: '600' },

    // ── Vehicle cards ──
    vehicleCard: { backgroundColor: c.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    vehicleIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
    vehicleTitle: { fontSize: 14, fontWeight: '800', color: c.text },
    vehicleReg: { fontSize: 12, color: c.primary, fontWeight: '700', marginTop: 2 },
    vehicleMeta: { fontSize: 12, color: c.textMuted, marginLeft: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    pieWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    healthLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
    healthPct: { fontSize: 12, fontWeight: '800' },
    healthBar: { height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
    healthBarFill: { height: 6, borderRadius: 3 },
    vehicleFinRow: { flexDirection: 'row', marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    vehicleFinItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    vehicleFinLabel: { fontSize: 10, color: c.textMuted, fontWeight: '600', marginBottom: 3 },
    vehicleFinEarnings: { fontSize: 12, fontWeight: '800', color: '#10b981' },
    vehicleFinExpenses: { fontSize: 12, fontWeight: '800', color: '#ef4444' },
    vehicleFinProfit: { fontSize: 12, fontWeight: '800' },

    // ── Quick actions (Vehicles & Messages tabs) ──
    quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    quickActionBtn: { flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: c.border },
    quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickActionTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // ── Messages tab ──
    unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#f59e0b' },
    unreadBannerTxt: { fontSize: 13, fontWeight: '700', color: '#92400e' },

    // ── Profile tab ──
    profHeader: { alignItems: 'center', paddingVertical: 28, backgroundColor: c.surface, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    profAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profAvatarTxt: { color: '#fff', fontSize: 30, fontWeight: '900' },
    profName: { fontSize: 20, fontWeight: '900', color: c.text },
    profEmail: { fontSize: 13, color: c.textMuted, marginTop: 3 },
    profBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, backgroundColor: c.primary + '18', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    profBadgeTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    profGroupLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
    profActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    profActionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    profActionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 16, padding: 16, marginTop: 16 },
    logoutTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // ── Compat / misc ──
    btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    btnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: c.text, fontWeight: '700' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '800' },
  });
}
