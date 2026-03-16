import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueAnalytics, formatWaitTime, getStatusColor,
  getUtilizationColor, getWaitTimeColor,
} from '../api/queueManagement';
import { fetchTaxiRanks } from '../api/taxiRanks';

const { width: screenWidth } = Dimensions.get('window');
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function QueueAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rank, setRank] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // day, week, month
  const [selectedRankId, setSelectedRankId] = useState(null);

  // Load data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Load ranks if not already loaded
      if (ranks.length === 0 && user?.tenantId && user.tenantId !== EMPTY_GUID) {
        const ranksResp = await fetchTaxiRanks(user.tenantId);
        const ranksData = ranksResp.data || ranksResp || [];
        setRanks(ranksData);
        
        // Auto-select first rank if none selected
        if (!rank && ranksData.length > 0) {
          const firstRank = ranksData[0];
          setRank(firstRank);
          setSelectedRankId(firstRank.id);
        }
      }

      // Load analytics for selected rank
      const targetRankId = selectedRankId || rank?.id;
      if (targetRankId) {
        const startDate = getStartDate(selectedPeriod);
        const endDate = new Date().toISOString().split('T')[0];
        
        const analyticsData = await getQueueAnalytics(targetRankId, startDate, endDate);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.warn('Analytics load error', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rank, ranks, selectedRankId, selectedPeriod, user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Get start date based on period
  const getStartDate = (period) => {
    const now = new Date();
    switch (period) {
      case 'day':
        return now.toISOString().split('T')[0];
      case 'week':
        now.setDate(now.getDate() - 7);
        return now.toISOString().split('T')[0];
      case 'month':
        now.setMonth(now.getMonth() - 1);
        return now.toISOString().split('T')[0];
      default:
        now.setDate(now.getDate() - 7);
        return now.toISOString().split('T')[0];
    }
  };

  // Handle rank selection
  const handleRankChange = (rankId) => {
    setSelectedRankId(rankId);
    const selectedRank = ranks.find(r => r.id === rankId);
    setRank(selectedRank);
  };

  // Export analytics data
  const handleExport = () => {
    if (!analytics) {
      Alert.alert('No Data', 'No analytics data available to export');
      return;
    }

    // Create CSV content (simplified version)
    const csvContent = generateCSV();
    Alert.alert('Export Ready', 'Analytics data prepared for export', [
      { text: 'OK', onPress: () => console.log('CSV Content:', csvContent) }
    ]);
  };

  // Generate CSV content
  const generateCSV = () => {
    if (!analytics) return '';

    let csv = `Queue Analytics Report\n`;
    csv += `Period: ${analytics.periodStart} to ${analytics.periodEnd}\n\n`;
    csv += `Total Vehicles Processed,${analytics.totalVehiclesProcessed}\n`;
    csv += `Average Queue Length,${analytics.averageQueueLength.toFixed(2)}\n`;
    csv += `Average Wait Time (minutes),${analytics.averageWaitTime.toFixed(2)}\n\n`;
    
    csv += `Peak Hours\n`;
    csv += `Hour,Dispatch Count,Average Wait Time\n`;
    analytics.peakHours?.forEach(hour => {
      csv += `${hour.hour},${hour.dispatchCount},${hour.averageWaitTime.toFixed(2)}\n`;
    });
    
    return csv;
  };

  // Render header
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={c.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Queue Analytics</Text>
        <Text style={[styles.headerSub, { color: c.textMuted }]}>
          {rank?.name || 'Loading...'}
        </Text>
      </View>
      <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
        <Ionicons name="download-outline" size={20} color={c.primary} />
      </TouchableOpacity>
    </View>
  );

  // Render rank selector
  const renderRankSelector = () => (
    <View style={[styles.rankSelector, { borderColor: c.border }]}>
      <Text style={[styles.selectorLabel, { color: c.textMuted }]}>Taxi Rank:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.rankOptions}>
          {ranks.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.rankOption,
                (selectedRankId || rank?.id) === r.id && { backgroundColor: c.primary }
              ]}
              onPress={() => handleRankChange(r.id)}>
              <Text style={[
                styles.rankOptionText,
                (selectedRankId || rank?.id) === r.id && { color: '#fff' }
              ]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Render period selector
  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[
        { key: 'day', label: 'Today' },
        { key: 'week', label: 'Week' },
        { key: 'month', label: 'Month' },
      ].map(period => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodBtn,
            selectedPeriod === period.key && { backgroundColor: c.primary }
          ]}
          onPress={() => setSelectedPeriod(period.key)}>
          <Text style={[
            styles.periodBtnText,
            selectedPeriod === period.key && { color: '#fff' }
          ]}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render summary cards
  const renderSummaryCards = () => {
    if (!analytics) return null;

    return (
      <View style={styles.summaryCards}>
        <SummaryCard
          icon="directions-car"
          label="Total Processed"
          value={analytics.totalVehiclesProcessed}
          color="#22c55e"
          c={c}
          styles={styles}
        />
        <SummaryCard
          icon="people"
          label="Avg Queue Length"
          value={analytics.averageQueueLength?.toFixed(1) || '0'}
          color="#3b82f6"
          c={c}
          styles={styles}
        />
        <SummaryCard
          icon="schedule"
          label="Avg Wait Time"
          value={`${Math.round(analytics.averageWaitTime || 0)}m`}
          color="#f59e0b"
          c={c}
          styles={styles}
        />
      </View>
    );
  };

  // Render peak hours section
  const renderPeakHours = () => {
    if (!analytics?.peakHours?.length) return null;

    return (
      <AnalyticsSection title="Peak Hours" c={c} styles={styles}>
        {analytics.peakHours.slice(0, 5).map((hour, index) => (
          <View key={hour.hour} style={[styles.analyticsItem, { borderBottomColor: c.border }]}>
            <View style={styles.analyticsItemLeft}>
              <Text style={[styles.analyticsItemTitle, { color: c.text }]}>
                {hour.hour}:00
              </Text>
              <Text style={[styles.analyticsItemSubtitle, { color: c.textMuted }]}>
                {hour.dispatchCount} dispatches
              </Text>
            </View>
            <View style={styles.analyticsItemRight}>
              <Text style={[
                styles.analyticsItemValue,
                { color: getWaitTimeColor(hour.averageWaitTime) }
              ]}>
                {Math.round(hour.averageWaitTime)}m
              </Text>
              <Text style={[styles.analyticsItemLabel, { color: c.textMuted }]}>
                avg wait
              </Text>
            </View>
          </View>
        ))}
      </AnalyticsSection>
    );
  };

  // Render route performance section
  const renderRoutePerformance = () => {
    if (!analytics?.routePerformance?.length) return null;

    return (
      <AnalyticsSection title="Route Performance" c={c} styles={styles}>
        {analytics.routePerformance.slice(0, 5).map((route, index) => (
          <View key={route.routeId || index} style={[styles.analyticsItem, { borderBottomColor: c.border }]}>
            <View style={styles.analyticsItemLeft}>
              <Text style={[styles.analyticsItemTitle, { color: c.text }]}>
                {route.routeName || 'Unknown Route'}
              </Text>
              <Text style={[styles.analyticsItemSubtitle, { color: c.textMuted }]}>
                {route.totalDispatches} dispatches • {Math.round(route.averageWaitTime)}m avg wait
              </Text>
            </View>
            <View style={styles.analyticsItemRight}>
              <Text style={[
                styles.analyticsItemValue,
                { color: getUtilizationColor(route.utilizationRate) }
              ]}>
                {route.utilizationRate?.toFixed(1)}%
              </Text>
              <Text style={[styles.analyticsItemLabel, { color: c.textMuted }]}>
                utilization
              </Text>
            </View>
            {/* Utilization bar */}
            <View style={[styles.utilizationBar, { backgroundColor: c.background }]}>
              <View 
                style={[
                  styles.utilizationFill,
                  { 
                    width: `${Math.min(route.utilizationRate || 0, 100)}%`,
                    backgroundColor: getUtilizationColor(route.utilizationRate)
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </AnalyticsSection>
    );
  };

  // Render daily trends section
  const renderDailyTrends = () => {
    if (!analytics?.dailyTrends?.length) return null;

    return (
      <AnalyticsSection title="Daily Trends" c={c} styles={styles}>
        {analytics.dailyTrends.slice(-7).map((trend, index) => (
          <View key={trend.date} style={[styles.analyticsItem, { borderBottomColor: c.border }]}>
            <View style={styles.analyticsItemLeft}>
              <Text style={[styles.analyticsItemTitle, { color: c.text }]}>
                {new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={[styles.analyticsItemSubtitle, { color: c.textMuted }]}>
                {trend.dispatchedVehicles} dispatched • {trend.totalVehicles} total
              </Text>
            </View>
            <View style={styles.analyticsItemRight}>
              <Text style={[
                styles.analyticsItemValue,
                { color: getWaitTimeColor(trend.peakWaitTime) }
              ]}>
                {Math.round(trend.peakWaitTime)}m
              </Text>
              <Text style={[styles.analyticsItemLabel, { color: c.textMuted }]}>
                peak wait
              </Text>
            </View>
          </View>
        ))}
      </AnalyticsSection>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading analytics…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        contentContainerStyle={{ paddingBottom: 32 }}>
        
        {renderRankSelector()}
        {renderPeriodSelector()}
        {renderSummaryCards()}
        {renderPeakHours()}
        {renderRoutePerformance()}
        {renderDailyTrends()}

        {!analytics && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={56} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No Analytics Data</Text>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              Try selecting a different period or check back later
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color, c, styles }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.summaryValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function AnalyticsSection({ title, children, c, styles }) {
  return (
    <View style={[styles.analyticsSection, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.analyticsSectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 12, marginTop: 1 },
    exportBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Content
    content: { flex: 1 },

    // Rank Selector
    rankSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    selectorLabel: { fontSize: 12, fontWeight: '600', marginRight: 12 },
    rankOptions: { flexDirection: 'row', gap: 8 },
    rankOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    rankOptionText: { fontSize: 12, fontWeight: '600', color: c.text },

    // Period Selector
    periodSelector: { flexDirection: 'row', margin: 16, gap: 8 },
    periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    periodBtnText: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.text },

    // Summary Cards
    summaryCards: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
    summaryCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
    summaryValue: { fontSize: 20, fontWeight: '900', marginTop: 8 },
    summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },

    // Analytics Sections
    analyticsSection: { marginHorizontal: 16, marginVertical: 8, borderRadius: 12, padding: 16, borderWidth: 1 },
    analyticsSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

    analyticsItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    analyticsItemLeft: { flex: 1 },
    analyticsItemTitle: { fontSize: 14, fontWeight: '600' },
    analyticsItemSubtitle: { fontSize: 12, marginTop: 2 },
    analyticsItemRight: { alignItems: 'flex-end' },
    analyticsItemValue: { fontSize: 16, fontWeight: '800' },
    analyticsItemLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

    // Utilization Bar
    utilizationBar: { height: 4, borderRadius: 2, marginTop: 8, width: '100%' },
    utilizationFill: { height: '100%', borderRadius: 2 },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
    emptyText: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  });
}
