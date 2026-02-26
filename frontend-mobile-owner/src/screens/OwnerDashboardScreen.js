import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, FlatList, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
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

export default function OwnerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, mode } = useAppTheme();
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

  useEffect(() => {
    navigation.setOptions({
      title: 'Mzansi Fleet - Dashboard',
    });
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
      const earnings = Number(v.earnings) || 0;
      const expenses = Number(v.expenses) || 0;
      const profit = earnings - expenses;
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
    try {
      setRequestsBusy(true);
      await declineMechanicalRequest(id, 'Declined via mobile app');
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

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" /></View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.greeting}>Welcome{user?.fullName ? `, ${user.fullName}` : ''}</Text>

      <Text style={styles.sectionTitle}>Overview (This Month)</Text>
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
      {/* earnings vs expenses comparison row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{currency(analytics?.totalEarnings)}</Text>
          <Text style={styles.metricLabel}>Total Earnings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{currency(analytics?.totalExpenses)}</Text>
          <Text style={styles.metricLabel}>Total Expenses</Text>
        </View>
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{maintenanceRequests.filter(r => r.state === 'Pending').length}</Text>
          <Text style={styles.metricLabel}>Maintenance Alerts</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{currency(analytics?.avgProfitPerVehicle)}</Text>
          <Text style={styles.metricLabel}>Avg Profit/Vehicle</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{vehiclesCount}</Text>
          <Text style={styles.metricLabel}>Vehicles</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{maintenanceTomorrow}</Text>
          <Text style={styles.metricLabel}>Maintenance Tomorrow</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{unreadMessages}</Text>
          <Text style={styles.metricLabel}>Unread Messages</Text>
        </View>
      </View>

      <View style={{ height: 12 }} />
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Fleet Earnings vs Expenses</Text>
            <Text style={styles.sectionSubTitle}>This Month</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Earnings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f87171' }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#d1d5db' }]} />
            <Text style={styles.legendText}>Profit</Text>
          </View>
        </View>

        {vehicleChartData ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <StackedBarChart
              data={vehicleChartData}
              width={vehicleChartWidth}
              height={280}
              yAxisLabel="R"
              fromZero
              withInnerLines={true}
              segments={5}
              chartConfig={{
                ...chartConfig,
                color: () => '#111827',
                decimalPlaces: 0,
                formatYLabel: (y) => {
                  const n = Number(y);
                  if (!Number.isFinite(n)) return String(y);
                  return String(Math.round(n));
                },
                propsForLabels: { fontSize: 9 },
                propsForBackgroundLines: { stroke: '#e5e7eb', strokeDasharray: '0' },
              }}
              style={styles.chart}
            />
          </ScrollView>
        ) : (
          <Text style={styles.empty}>No chart data</Text>
        )}

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

            <View style={[styles.breakdownRow, styles.breakdownTotalsRow]}>
              <Text style={[styles.breakdownLabel, styles.breakdownTotalsLabel]}>Totals</Text>
              <Text style={[styles.breakdownE, styles.breakdownTotalsValue]}>
                + {currency(vehiclePerfRows.slice(0, 6).reduce((s, r) => s + (Number(r.earnings) || 0), 0))}
              </Text>
              <Text style={[styles.breakdownX, styles.breakdownTotalsValue]}>
                - {currency(vehiclePerfRows.slice(0, 6).reduce((s, r) => s + (Number(r.expenses) || 0), 0))}
              </Text>
              {(() => {
                const e = vehiclePerfRows.slice(0, 6).reduce((s, r) => s + (Number(r.earnings) || 0), 0);
                const x = vehiclePerfRows.slice(0, 6).reduce((s, r) => s + (Number(r.expenses) || 0), 0);
                const p = e - x;
                return (
                  <Text style={[styles.breakdownP, styles.breakdownTotalsValue, { color: p >= 0 ? '#059669' : '#dc2626' }]}>
                    {p >= 0 ? '+ ' : '- '}{currency(Math.abs(p))}
                  </Text>
                );
              })()}
            </View>

            {vehiclePerfRows.length > 6 && (
              <Text style={styles.breakdownMore}>Showing 6 of {vehiclePerfRows.length}</Text>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 12 }} />
      <Text style={styles.sectionTitle}>Vehicle Performance</Text>
      {analytics?.vehiclePerformance?.length ? (
        <FlatList
          data={analytics.vehiclePerformance}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('VehiclePerformance', { vehicle: item })}>
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.vehicleTitle}>{item.make} {item.model} ({item.registration})</Text>
                  </View>
                  <View style={styles.pieWrap}>
                    <PieChart
                      data={buildPieData(item.earnings, item.expenses)}
                      width={124}
                      height={124}
                      chartConfig={chartConfig}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft="18"
                      hasLegend={false}
                    />
                  </View>
                </View>
                <Text style={styles.healthText}>Health: {item.healthScore}%</Text>
                <Text style={styles.vehicleMeta}>Status: {item.status || 'Unknown'}{item.isInService ? ' · In Service' : ''}</Text>
                <View style={styles.vehicleNumbersRow}>
                  <Text style={styles.earnings}>Earnings: + {currency(item.earnings)}</Text>
                  <Text style={styles.expenses}>Expenses: - {currency(item.expenses)}</Text>
                  <Text style={[styles.profit, { color: (item.profit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                    Profit: {(Number(item.profit) || 0) >= 0 ? '+ ' : '- '}{currency(Math.abs(Number(item.profit) || 0))}
                  </Text>
                </View>
                <Text style={styles.tapHint}>Tap to view weekly data</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.empty}>No vehicle performance data</Text>
      )}

      <View style={{ height: 12 }} />
      <Text style={styles.sectionTitle}>Maintenance Requests</Text>
      {maintenanceRequests.length === 0 ? (
        <Text style={styles.empty}>No maintenance requests</Text>
      ) : (
        <>
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={requestsPage <= 1}
              style={[styles.btn, requestsPage <= 1 && styles.btnDisabled]}
              onPress={() => setRequestsPage(p => Math.max(1, p - 1))}
            >
              <Text style={styles.btnText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>Page {Math.min(requestsPage, maintenanceTotalPages)} of {maintenanceTotalPages}</Text>
            <TouchableOpacity
              disabled={requestsPage >= maintenanceTotalPages}
              style={[styles.btn, requestsPage >= maintenanceTotalPages && styles.btnDisabled]}
              onPress={() => setRequestsPage(p => Math.min(maintenanceTotalPages, p + 1))}
            >
              <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </View>
          <FlatList
          data={pagedMaintenanceRequests}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('OwnerMaintenanceRequestDetails', { request: item })}>
              <View style={styles.requestCard}>
                <Text style={styles.requestTitle}>{item.vehicleRegistration || 'Vehicle'} · {item.priority || 'Normal'} · {item.state || item.status}</Text>
                <Text style={styles.requestBody}>{item.issueDescription || item.description || item.Description || 'No description'}</Text>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {item.state === 'Pending' ? (
                    <>
                      <TouchableOpacity
                        disabled={requestsBusy}
                        style={[styles.btn, styles.btnPrimary]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onApproveRequest(item.id);
                        }}
                      >
                        <Text style={[styles.btnText, styles.btnPrimaryText]}>Approve</Text>
                      </TouchableOpacity>
                      <View style={{ width: 8 }} />
                      <TouchableOpacity
                        disabled={requestsBusy}
                        style={styles.btn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onDeclineRequest(item.id);
                        }}
                      >
                        <Text style={styles.btnText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  ) : item.state === 'Scheduled' ? (
                    <TouchableOpacity
                      disabled={requestsBusy}
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onCompleteRequest(item.id);
                      }}
                    >
                      <Text style={[styles.btnText, styles.btnPrimaryText]}>Complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.requestMeta}>Tap to view details</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          />
        </>
      )}

      <View style={{ height: 12 }} />
      <Text style={styles.sectionTitle}>Recent Tenders</Text>
      {recentTenders.length === 0 ? (
        <Text style={styles.empty}>No recent tenders</Text>
      ) : (
        <FlatList
          data={recentTenders}
          keyExtractor={item => item.id || item.tenderId || String(item.createdAt)}
          renderItem={({ item }) => (
            <View style={styles.tenderCard}>
              <Text style={styles.tenderTitle}>{item.title}</Text>
              <Text style={styles.tenderMeta}>{item.publisherName || item.publisher || ''} · {item.budgetMax ? `R${item.budgetMax}` : 'Budget N/A'}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={styles.btn} onPress={() => openTender(item)}>
                  <Text style={styles.btnText}>View</Text>
                </TouchableOpacity>
                <View style={{ width: 8 }} />
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => applyToTender(item)}>
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={{ height: 18 }} />
      <Button color={c.primary} title="Open Rental Marketplace" onPress={() => navigation.navigate('RentalMarketplace')} />
      <View style={{ height: 8 }} />
      <Button color={c.primary} title="Vehicles" onPress={() => navigation.navigate('OwnerVehicles')} />
      <View style={{ height: 8 }} />
      <Button color={c.primary} title="Messages" onPress={() => navigation.navigate('OwnerMessages')} />
      <View style={{ height: 18 }} />
      <Button color={c.primary} title="Logout" onPress={() => navigation.navigate('Login')} />
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    greeting: { fontSize: 20, fontWeight: '600', marginBottom: 12, color: c.text },
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
    requestTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    requestBody: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    requestMeta: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    btnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.text, fontWeight: '700' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '800' },
    paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    paginationText: { fontSize: 12, color: c.textMuted },
    headerToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    headerToggleText: { color: c.text, fontWeight: '800', fontSize: 12 },
  });
}
