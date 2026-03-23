import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { fetchDriverEvents, fetchDriverScoreboard } from '../api/driverBehavior';

function toDateLabel(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function scoreColor(score) {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function severityColor(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
}

function computeDerivedFromEvents(events) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const safeEvents = Array.isArray(events) ? events : [];
  const recent90 = safeEvents.filter(e => e?.eventDate && new Date(e.eventDate) >= ninetyDaysAgo);
  const recent30 = safeEvents.filter(e => e?.eventDate && new Date(e.eventDate) >= thirtyDaysAgo);
  const olderWithin90 = recent90.filter(e => e?.eventDate && new Date(e.eventDate) < thirtyDaysAgo);

  const score = Math.max(0, Math.min(100, 100 + recent90.reduce((sum, e) => sum + (+e?.pointsImpact || 0), 0)));
  const positiveEvents = safeEvents.filter(e => e?.eventType === 'Positive').length;
  const negativeEvents = safeEvents.filter(e => e?.eventType === 'Negative').length;
  const unresolvedEvents = safeEvents.filter(e => e?.eventType === 'Negative' && !e?.isResolved).length;

  const impact30 = recent30.reduce((sum, e) => sum + (+e?.pointsImpact || 0), 0);
  const olderImpact = olderWithin90.reduce((sum, e) => sum + (+e?.pointsImpact || 0), 0);
  const trend = impact30 > olderImpact ? 'Improving' : impact30 < olderImpact ? 'Declining' : 'Stable';

  const topCategory = Object.entries(
    safeEvents
      .filter(e => e?.eventType === 'Negative' && e?.category)
      .reduce((acc, e) => {
        const key = e.category;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    score,
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
    trend,
    totalEvents: safeEvents.length,
    positiveEvents,
    negativeEvents,
    unresolvedEvents,
    last30DaysEvents: recent30.length,
    topCategory,
    lastEventDate: safeEvents[0]?.eventDate || null,
  };
}

export default function DriverBehaviorScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [score, setScore] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        setDriverProfile(null);
        setEvents([]);
        setScore(null);
        return;
      }

      const profilesResp = await client.get('/Identity/driverprofiles');
      const profiles = Array.isArray(profilesResp?.data) ? profilesResp.data : [];
      const me = profiles.find(p => p?.userId === userId) || null;
      setDriverProfile(me);

      if (!me?.id) {
        setEvents([]);
        setScore(null);
        return;
      }

      const [eventData, scoreboardData] = await Promise.all([
        fetchDriverEvents(me.id, 200).catch(() => []),
        user?.tenantId ? fetchDriverScoreboard(user.tenantId).catch(() => []) : Promise.resolve([]),
      ]);

      const safeEvents = Array.isArray(eventData) ? eventData : [];
      setEvents(safeEvents);

      const boardRow = Array.isArray(scoreboardData)
        ? scoreboardData.find(x => x?.driverId === me.id)
        : null;

      setScore(boardRow || computeDerivedFromEvents(safeEvents));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.tenantId, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const positives = useMemo(() => events.filter(e => e?.eventType === 'Positive'), [events]);
  const negatives = useMemo(() => events.filter(e => e?.eventType === 'Negative'), [events]);

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[s.muted, { marginTop: 12 }]}>Loading behavior...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>My Driver Behavior</Text>
          <Text style={s.headerSub}>Safety score and event history</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {!driverProfile ? (
          <View style={s.emptyCard}>
            <Ionicons name="person-circle-outline" size={40} color={c.textMuted} />
            <Text style={s.emptyTitle}>Driver profile not found</Text>
            <Text style={s.emptySub}>This account is not linked to a driver profile yet.</Text>
          </View>
        ) : (
          <>
            <View style={s.scoreCard}>
              <View>
                <Text style={s.scoreLabel}>Behavior Score</Text>
                <Text style={[s.scoreValue, { color: scoreColor(score?.score || 0) }]}>{score?.score ?? 0}</Text>
                <Text style={s.scoreMeta}>
                  Grade {score?.grade || '-'} • {score?.trend || 'Stable'}
                </Text>
              </View>
              <View style={[s.gradeBadge, { borderColor: scoreColor(score?.score || 0) }]}>
                <Text style={[s.gradeText, { color: scoreColor(score?.score || 0) }]}>{score?.grade || '-'}</Text>
              </View>
            </View>

            <View style={s.metricRow}>
              <View style={s.metricCard}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                <Text style={s.metricValue}>{score?.positiveEvents ?? positives.length}</Text>
                <Text style={s.metricLabel}>Positive</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={s.metricValue}>{score?.negativeEvents ?? negatives.length}</Text>
                <Text style={s.metricLabel}>Negative</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                <Text style={s.metricValue}>{score?.unresolvedEvents ?? 0}</Text>
                <Text style={s.metricLabel}>Open Issues</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
                <Text style={s.metricValue}>{score?.last30DaysEvents ?? 0}</Text>
                <Text style={s.metricLabel}>Last 30 Days</Text>
              </View>
            </View>

            {score?.topCategory ? (
              <View style={s.topIssueCard}>
                <Ionicons name="flag-outline" size={16} color="#f97316" />
                <Text style={s.topIssueText}>Top issue category: {score.topCategory}</Text>
              </View>
            ) : null}

            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Recent Events</Text>
              <Text style={s.sectionSub}>{events.length} total</Text>
            </View>

            {events.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="sparkles-outline" size={36} color={c.textMuted} />
                <Text style={s.emptyTitle}>No behavior events</Text>
                <Text style={s.emptySub}>You have no recorded behavior events yet.</Text>
              </View>
            ) : (
              events.map((evt) => {
                const isPositive = evt?.eventType === 'Positive';
                const pts = Number(evt?.pointsImpact || 0);
                const sevColor = severityColor(evt?.severity);
                return (
                  <View key={evt?.id || `${evt?.eventDate}-${evt?.category}`} style={s.eventCard}>
                    <View style={s.eventTop}>
                      <View style={[s.eventIcon, { backgroundColor: isPositive ? '#22c55e22' : '#ef444422' }]}>
                        <Ionicons
                          name={isPositive ? 'thumbs-up-outline' : 'warning-outline'}
                          size={16}
                          color={isPositive ? '#22c55e' : '#ef4444'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.eventCategory}>{evt?.category || 'Event'}</Text>
                        <Text style={s.eventDate}>{toDateLabel(evt?.eventDate)}</Text>
                      </View>
                      <Text style={[s.eventPoints, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
                        {pts > 0 ? '+' : ''}{pts}
                      </Text>
                    </View>

                    {!!evt?.description && <Text style={s.eventDesc}>{evt.description}</Text>}

                    <View style={s.eventMetaRow}>
                      <View style={[s.tag, { borderColor: sevColor }]}> 
                        <Text style={[s.tagText, { color: sevColor }]}>{evt?.severity || 'Medium'}</Text>
                      </View>
                      <View style={[s.tag, { borderColor: evt?.isResolved ? '#22c55e' : '#f59e0b' }]}> 
                        <Text style={[s.tagText, { color: evt?.isResolved ? '#22c55e' : '#f59e0b' }]}>
                          {evt?.isResolved ? 'Resolved' : 'Open'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: c.text },
    headerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    scoreCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    scoreLabel: { fontSize: 12, color: c.textMuted, fontWeight: '700' },
    scoreValue: { fontSize: 34, fontWeight: '900', marginTop: 2 },
    scoreMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    gradeBadge: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    gradeText: { fontSize: 26, fontWeight: '900' },

    metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    metricCard: {
      width: '47%',
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    metricValue: { fontSize: 18, fontWeight: '900', color: c.text, marginTop: 6 },
    metricLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '700' },

    topIssueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      backgroundColor: '#f9731614',
      borderWidth: 1,
      borderColor: '#f9731640',
      padding: 11,
      marginBottom: 14,
    },
    topIssueText: { color: '#f97316', fontWeight: '700', fontSize: 12 },

    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: c.text },
    sectionSub: { fontSize: 11, color: c.textMuted },

    eventCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    eventTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eventIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    eventCategory: { fontSize: 13, fontWeight: '800', color: c.text },
    eventDate: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    eventPoints: { fontSize: 16, fontWeight: '900' },
    eventDesc: { fontSize: 12, color: c.textMuted, marginTop: 8, lineHeight: 17 },
    eventMetaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    tag: { borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
    tagText: { fontSize: 10, fontWeight: '800' },

    emptyCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingVertical: 26,
      paddingHorizontal: 14,
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginTop: 8 },
    emptySub: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 4 },
    muted: { fontSize: 13, color: c.textMuted },
  });
}
