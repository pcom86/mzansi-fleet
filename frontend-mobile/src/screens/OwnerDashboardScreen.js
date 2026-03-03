import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, FlatList, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
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
import { approveMechanicalRequest, completeMechanicalRequest, declineMechanicalRequest, getMechanicalRequests } from '../api/maintenance';
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

  useEffect(() => {
    let mounted = true;
    async function load() {
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
        Alert.alert('Error', 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

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
    return (
      <TouchableOpacity key={item.id} onPress={() => navigation.navigate('OwnerMaintenanceRequestDetails', { request: item })}>
        <View style={styles.requestCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.requestTitle}>{item.vehicleRegistration || 'Vehicle'} · {item.category || 'Maintenance'}</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateColor(item.state) + '22', borderColor: stateColor(item.state) }]}>
              <Text style={[styles.stateBadgeTxt, { color: stateColor(item.state) }]}>{item.state || item.status || 'Open'}</Text>
            </View>
          </View>
          <Text style={styles.requestBody}>{item.issueDescription || item.description || 'No description'}</Text>
          {item.preferredTime ? <Text style={styles.requestMeta}>Preferred: {new Date(item.preferredTime).toLocaleDateString()}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
            {item.state === 'Pending' ? (
              <>
                <TouchableOpacity disabled={requestsBusy} style={[styles.btn, styles.btnPrimary]} onPress={(e) => { e.stopPropagation?.(); onApproveRequest(item.id); }}>
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={requestsBusy} style={[styles.btn, styles.btnDanger]} onPress={(e) => { e.stopPropagation?.(); onDeclineRequest(item.id); }}>
                  <Text style={[styles.btnText, styles.btnDangerText]}>✕ Decline</Text>
                </TouchableOpacity>
              </>
            ) : item.state === 'Approved' ? (
              <TouchableOpacity disabled={requestsBusy} style={[styles.btn, styles.btnPrimary]} onPress={(e) => { e.stopPropagation?.(); navigation.navigate('OwnerMaintenanceRequestDetails', { request: item }); }}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>📅 Schedule</Text>
              </TouchableOpacity>
            ) : item.state === 'Scheduled' ? (
              <TouchableOpacity disabled={requestsBusy} style={[styles.btn, styles.btnPrimary]} onPress={(e) => { e.stopPropagation?.(); onCompleteRequest(item.id); }}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>✓ Complete</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.requestMeta}>Tap to view details</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return (
    <View style={styles.root}><ActivityIndicator size="large" color={c.primary} style={{ flex: 1 }} /></View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.fullName?.split(' ')[0] || 'Owner'} 👋</Text>
          <Text style={styles.subhead}>Owner Portal</Text>
        </View>
        <TouchableOpacity style={{ padding: 6 }} onPress={() => setTab('profile')}>
          <Ionicons name="person-circle-outline" size={26} color={tab === 'profile' ? c.primary : c.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{currency(analytics?.totalProfit)}</Text>
                <Text style={styles.metricLabel}>Total Profit</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analytics?.totalVehicles ?? vehiclesCount}</Text>
                <Text style={styles.metricLabel}>Fleet Size</Text>
              </View>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{currency(analytics?.totalEarnings)}</Text>
                <Text style={styles.metricLabel}>Earnings</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{currency(analytics?.totalExpenses)}</Text>
                <Text style={styles.metricLabel}>Expenses</Text>
              </View>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{pendingMaint}</Text>
                <Text style={styles.metricLabel}>Pending Maint.</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{maintenanceTomorrow}</Text>
                <Text style={styles.metricLabel}>Maint. Tomorrow</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{unreadMessages}</Text>
                <Text style={styles.metricLabel}>Unread Msgs</Text>
              </View>
            </View>

            <View style={{ height: 12 }} />
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Fleet Earnings vs Expenses</Text>
              <Text style={styles.sectionSubTitle}>This Month</Text>
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
                    data={vehicleChartData} width={vehicleChartWidth} height={260} yAxisLabel="R"
                    fromZero withInnerLines segments={5}
                    chartConfig={{ ...chartConfig, color: () => '#111827', decimalPlaces: 0,
                      formatYLabel: y => { const n = Number(y); return Number.isFinite(n) ? String(Math.round(n)) : String(y); },
                      propsForLabels: { fontSize: 9 }, propsForBackgroundLines: { stroke: '#e5e7eb', strokeDasharray: '0' } }}
                    style={styles.chart}
                  />
                </ScrollView>
              ) : <Text style={styles.empty}>No chart data</Text>}

              {vehiclePerfRows.length > 0 && (
                <View style={styles.breakdownWrap}>
                  <Text style={styles.breakdownTitle}>Breakdown</Text>
                  {vehiclePerfRows.slice(0, 6).map(r => (
                    <View key={r.id} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{r.label}</Text>
                      <Text style={styles.breakdownE}>+ {currency(r.earnings)}</Text>
                      <Text style={styles.breakdownX}>- {currency(r.expenses)}</Text>
                      <Text style={[styles.breakdownP, { color: r.profit >= 0 ? '#059669' : '#dc2626' }]}>
                        {r.profit >= 0 ? '+ ' : '- '}{currency(Math.abs(r.profit))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Recent Tenders</Text>
            {recentTenders.length === 0 ? <Text style={styles.empty}>No recent tenders</Text> : recentTenders.map(item => (
              <View key={item.id || item.tenderId} style={styles.tenderCard}>
                <Text style={styles.tenderTitle}>{item.title}</Text>
                <Text style={styles.tenderMeta}>{item.publisherName || ''} · {item.budgetMax ? `R${item.budgetMax}` : 'Budget N/A'}</Text>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TouchableOpacity style={styles.btn} onPress={() => openTender(item)}><Text style={styles.btnText}>View</Text></TouchableOpacity>
                  <View style={{ width: 8 }} />
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => applyToTender(item)}><Text style={[styles.btnText, styles.btnPrimaryText]}>Apply</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── MAINTENANCE ── */}
        {tab === 'maintenance' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={styles.sectionTitle}>Maintenance Requests</Text>
            {maintenanceRequests.length === 0
              ? <Text style={styles.empty}>No maintenance requests</Text>
              : <>
                  <View style={styles.paginationRow}>
                    <TouchableOpacity disabled={requestsPage <= 1} style={[styles.btn, requestsPage <= 1 && styles.btnDisabled]} onPress={() => setRequestsPage(p => Math.max(1, p - 1))}>
                      <Text style={styles.btnText}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationText}>Page {Math.min(requestsPage, maintenanceTotalPages)} of {maintenanceTotalPages}</Text>
                    <TouchableOpacity disabled={requestsPage >= maintenanceTotalPages} style={[styles.btn, requestsPage >= maintenanceTotalPages && styles.btnDisabled]} onPress={() => setRequestsPage(p => Math.min(maintenanceTotalPages, p + 1))}>
                      <Text style={styles.btnText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                  {pagedMaintenanceRequests.map(item => renderMaintenanceCard(item))}
                </>
            }
          </ScrollView>
        )}

        {/* ── VEHICLES ── */}
        {tab === 'vehicles' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={() => navigation.navigate('OwnerVehicles')}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>Fleet Performance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => navigation.navigate('OwnerVehicles')}>
                <Text style={styles.btnText}>My Fleet</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>Vehicle Performance</Text>
            {analytics?.vehiclePerformance?.length ? analytics.vehiclePerformance.map(item => (
              <TouchableOpacity key={item.id} onPress={() => navigation.navigate('VehiclePerformance', { vehicle: item })}>
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.vehicleTitle}>{item.make} {item.model} ({item.registration})</Text>
                      <Text style={styles.vehicleMeta}>Status: {item.status || 'Unknown'}{item.isInService ? ' · In Service' : ''}</Text>
                      <Text style={styles.healthText}>Health: {item.healthScore}%</Text>
                    </View>
                    <View style={styles.pieWrap}>
                      <PieChart data={buildPieData(item.earnings, item.expenses)} width={112} height={112} chartConfig={chartConfig} accessor="amount" backgroundColor="transparent" paddingLeft="16" hasLegend={false} />
                    </View>
                  </View>
                  <View style={styles.vehicleNumbersRow}>
                    <Text style={styles.earnings}>+ {currency(item.earnings)}</Text>
                    <Text style={styles.expenses}>- {currency(item.expenses)}</Text>
                    <Text style={[styles.profit, { color: (item.profit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                      {(Number(item.profit) || 0) >= 0 ? '+ ' : '- '}{currency(Math.abs(Number(item.profit) || 0))}
                    </Text>
                  </View>
                  <Text style={styles.tapHint}>Tap to view weekly data</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.empty}>No vehicle performance data</Text>}
          </ScrollView>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={styles.sectionTitle}>Messages</Text>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginBottom: 12 }]} onPress={() => navigation.navigate('OwnerMessages')}>
              <Text style={[styles.btnText, styles.btnPrimaryText]}>Open Full Inbox</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { marginBottom: 12 }]} onPress={() => navigation.navigate('OwnerComposeMessage')}>
              <Text style={styles.btnText}>+ Compose Message</Text>
            </TouchableOpacity>
            {unreadMessages > 0 && (
              <View style={{ backgroundColor: '#f59e0b22', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f59e0b' }}>
                <Text style={{ color: '#92400e', fontWeight: '700' }}>{unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={styles.profHeader}>
              <View style={styles.profAvatar}>
                <Text style={styles.profAvatarTxt}>{(user?.fullName || 'O')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.profName}>{user?.fullName || 'Owner'}</Text>
              <Text style={styles.profEmail}>{user?.email || ''}</Text>
            </View>

            <View style={styles.profSection}>
              <View style={styles.profRow}>
                <Ionicons name="business-outline" size={18} color={c.primary} />
                <Text style={styles.profRowTxt}>Fleet: {vehiclesCount} vehicle{vehiclesCount !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.profActionRow} onPress={() => navigation.navigate('OwnerVehicles')}>
              <View style={styles.profActionIcon}><Ionicons name="car-outline" size={20} color={c.primary} /></View>
              <Text style={styles.profActionTxt}>Manage Vehicles</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profActionRow} onPress={() => navigation.navigate('OwnerMessages')}>
              <View style={styles.profActionIcon}><Ionicons name="chatbubbles-outline" size={20} color={c.primary} /></View>
              <Text style={styles.profActionTxt}>Messages</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profActionRow} onPress={() => navigation.navigate('RentalMarketplace')}>
              <View style={styles.profActionIcon}><Ionicons name="storefront-outline" size={20} color={c.primary} /></View>
              <Text style={styles.profActionTxt}>Rental Marketplace</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profActionRow} onPress={() => navigation.navigate('OwnerTenders')}>
              <View style={styles.profActionIcon}><Ionicons name="document-text-outline" size={20} color={c.primary} /></View>
              <Text style={styles.profActionTxt}>Tenders</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profActionRow} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
              <View style={styles.profActionIcon}><Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={c.primary} /></View>
              <Text style={styles.profActionTxt}>{mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutTxt}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <View>
              <Ionicons name={tab === t.key ? t.activeIcon : t.icon} size={22} color={tab === t.key ? c.primary : c.textMuted} />
              {t.badge > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeTxt}>{t.badge}</Text></View>
              )}
            </View>
            <Text style={[styles.tabLbl, tab === t.key && { color: c.primary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 48, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    greeting: { fontSize: 16, fontWeight: '800', color: c.text },
    subhead: { fontSize: 11, color: c.textMuted, marginTop: 1 },

    // Bottom tab bar
    tabBar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: 16, paddingTop: 8 },
    tabItem: { flex: 1, alignItems: 'center', gap: 2 },
    tabLbl: { fontSize: 10, fontWeight: '600', color: c.textMuted },
    tabBadge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

    // Profile tab
    profHeader: { alignItems: 'center', paddingVertical: 24, backgroundColor: c.surface, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border },
    profAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    profAvatarTxt: { color: '#fff', fontSize: 28, fontWeight: '800' },
    profName: { fontSize: 18, fontWeight: '800', color: c.text },
    profEmail: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    profSection: { backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    profRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    profRowTxt: { fontSize: 14, color: c.text },
    profActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    profActionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    profActionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 14, padding: 16, marginTop: 8 },
    logoutTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

    metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    metricCard: { flex: 1, padding: 12, backgroundColor: c.surface, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: c.border },
    metricValue: { fontSize: 20, fontWeight: '700', color: c.text },
    metricLabel: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: c.text },
    sectionSubTitle: { fontSize: 12, color: c.textMuted, marginTop: -4, marginBottom: 8 },
    empty: { color: c.textMuted, marginBottom: 8 },
    chart: { borderRadius: 8, backgroundColor: c.surface, paddingVertical: 8, alignSelf: 'center' },
    chartCard: { backgroundColor: c.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.border },
    chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 12, color: c.text, fontWeight: '600' },
    breakdownWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    breakdownTitle: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 8 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    breakdownLabel: { flex: 1.2, fontSize: 12, fontWeight: '700', color: c.text },
    breakdownE: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: c.success },
    breakdownX: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: c.danger },
    breakdownP: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '800', color: c.text },
    breakdownTotalsRow: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 6, paddingTop: 8 },
    breakdownTotalsLabel: { fontWeight: '800' },
    breakdownTotalsValue: { fontWeight: '800' },
    breakdownMore: { fontSize: 11, color: c.textMuted, marginTop: 6, textAlign: 'right' },
    tenderCard: { padding: 12, backgroundColor: c.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    tenderTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    tenderMeta: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    vehicleCard: { padding: 12, backgroundColor: c.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    vehicleTitle: { fontSize: 13, fontWeight: '700', flex: 1, paddingRight: 8, color: c.text },
    vehicleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pieWrap: { width: 148, height: 132, alignItems: 'center', justifyContent: 'center' },
    vehicleMeta: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    vehicleNumbersRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    earnings: { fontSize: 12, color: c.success, fontWeight: '700' },
    expenses: { fontSize: 12, color: c.danger, fontWeight: '700' },
    profit: { fontSize: 12, fontWeight: '800', color: c.text },
    healthText: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
    tapHint: { fontSize: 10, color: c.textMuted, marginTop: 4 },
    requestCard: { padding: 12, backgroundColor: c.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    requestTitle: { fontSize: 13, fontWeight: '700', color: c.text, flex: 1 },
    stateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 8 },
    stateBadgeTxt: { fontSize: 10, fontWeight: '700' },
    requestBody: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    requestMeta: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    btnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.text, fontWeight: '700' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '800' },
    btnDanger: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
    btnDangerText: { color: '#ef4444', fontWeight: '800' },
    paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    paginationText: { fontSize: 12, color: c.textMuted },
    headerToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    headerToggleText: { color: c.text, fontWeight: '800', fontSize: 12 },
  });
}
