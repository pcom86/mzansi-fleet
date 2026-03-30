import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchDriverScoreboard, fetchDriverEvents, recordBehaviorEvent,
  resolveBehaviorEvent, fetchDriverRatings, BEHAVIOR_CATEGORIES,
} from '../api/driverBehavior';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';
const BLUE = '#0d6efd';

function gradeColor(grade) {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#3b82f6';
    case 'C': return '#f59e0b';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#6b7280';
  }
}

function trendIcon(trend) {
  switch (trend) {
    case 'Improving': return { name: 'trending-up', color: '#22c55e' };
    case 'Declining': return { name: 'trending-down', color: '#ef4444' };
    default: return { name: 'remove-outline', color: '#6b7280' };
  }
}

function fmtDate(d) {
  if (!d) return '--';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DriverScoreboardScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const tenantId = user?.tenantId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreboard, setScoreboard] = useState([]);
  const [tab, setTab] = useState('scoreboard'); // scoreboard | events

  // Record event modal
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Driver detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailDriver, setDetailDriver] = useState(null);
  const [driverEvents, setDriverEvents] = useState([]);
  const [driverRatingsData, setDriverRatingsData] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!tenantId) return;
    if (!silent) setLoading(true);
    try {
      const data = await fetchDriverScoreboard(tenantId);
      setScoreboard(data || []);
    } catch (err) {
      console.warn('Scoreboard load error:', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load driver scoreboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Derived stats
  const avgScore = scoreboard.length
    ? Math.round(scoreboard.reduce((s, d) => s + d.score, 0) / scoreboard.length)
    : 0;
  const totalEvents = scoreboard.reduce((s, d) => s + d.totalEvents, 0);
  const totalUnresolved = scoreboard.reduce((s, d) => s + d.unresolvedEvents, 0);

  async function openDriverDetail(driver) {
    setDetailDriver(driver);
    setDetailModalVisible(true);
    setLoadingEvents(true);
    setDriverRatingsData(null);
    try {
      const [events, ratingsResp] = await Promise.all([
        fetchDriverEvents(driver.driverId).catch(() => []),
        fetchDriverRatings(driver.driverId).catch(() => null),
      ]);
      setDriverEvents(events || []);
      setDriverRatingsData(ratingsResp);
    } catch {
      setDriverEvents([]);
      setDriverRatingsData(null);
    } finally {
      setLoadingEvents(false);
    }
  }

  function openRecordModal(driver) {
    setSelectedDriver(driver);
    setSelectedCategory(null);
    setEventDescription('');
    setEventLocation('');
    setRecordModalVisible(true);
  }

  async function handleRecordEvent() {
    if (!selectedCategory) return Alert.alert('Required', 'Select a behavior category');
    if (!selectedDriver) return;

    setSubmitting(true);
    try {
      await recordBehaviorEvent({
        driverId: selectedDriver.driverId,
        tenantId,
        reportedById: user?.userId || user?.id,
        category: selectedCategory.key,
        severity: selectedCategory.severity,
        description: eventDescription || selectedCategory.label,
        location: eventLocation || null,
        pointsImpact: selectedCategory.points,
        eventType: selectedCategory.type,
      });
      Alert.alert('Recorded', `${selectedCategory.label} event recorded for ${selectedDriver.driverName}`);
      setRecordModalVisible(false);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to record event');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolveEvent(eventId) {
    Alert.alert('Resolve Event', 'Mark this event as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve', onPress: async () => {
          try {
            await resolveBehaviorEvent(eventId, 'Resolved by owner');
            setDriverEvents(prev => prev.map(e => e.id === eventId ? { ...e, isResolved: true } : e));
            loadData(true);
          } catch {
            Alert.alert('Error', 'Failed to resolve event');
          }
        }
      }
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View><Ionicons name="arrow-back" size={22} color="#fff" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text style={styles.headerTitle}>Driver Scoreboard</Text>
            <Text style={styles.headerSub}>Monitor driver behavior</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={{ marginTop: 12, color: c.textMuted }}>Loading scoreboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View><Ionicons name="arrow-back" size={22} color="#fff" /></View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={styles.headerTitle}>Driver Scoreboard</Text>
          <Text style={styles.headerSub}>Monitor & score driver behavior</Text>
        </View>
        <TouchableOpacity onPress={() => openRecordModal(scoreboard[0])} style={styles.addBtn}>
          <View><Ionicons name="add-circle" size={24} color={GOLD} /></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="people-outline" size={20} color={BLUE} />
            <Text style={[styles.summaryValue, { color: c.text }]}>{scoreboard.length}</Text>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Drivers</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="speedometer-outline" size={20} color={GOLD} />
            <Text style={[styles.summaryValue, { color: c.text }]}>{avgScore}</Text>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Avg Score</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="alert-circle-outline" size={20} color={RED} />
            <Text style={[styles.summaryValue, { color: c.text }]}>{totalUnresolved}</Text>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Unresolved</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="list-outline" size={20} color={GREEN} />
            <Text style={[styles.summaryValue, { color: c.text }]}>{totalEvents}</Text>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Total Events</Text>
          </View>
        </View>

        {/* Scoreboard Header */}
        <View style={styles.sectionRow}>
          <Ionicons name="trophy-outline" size={18} color={GOLD} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Driver Rankings</Text>
        </View>

        {scoreboard.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="people-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No Drivers Found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Add drivers to your fleet to start tracking behavior</Text>
          </View>
        ) : (
          scoreboard.map((driver, idx) => {
            const gc = gradeColor(driver.grade);
            const ti = trendIcon(driver.trend);
            return (
              <TouchableOpacity
                key={driver.driverId}
                style={[styles.driverCard, { backgroundColor: c.surface, borderColor: c.border }]}
                activeOpacity={0.85}
                onPress={() => openDriverDetail(driver)}
              >
                <View style={styles.driverCardTop}>
                  {/* Rank */}
                  <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? GOLD_LIGHT : c.background }]}>
                    <Text style={[styles.rankText, { color: idx < 3 ? GOLD : c.textMuted }]}>#{idx + 1}</Text>
                  </View>

                  {/* Driver Info */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.driverName, { color: c.text }]}>{driver.driverName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {driver.phone ? <Text style={[styles.driverMeta, { color: c.textMuted }]}>{driver.phone}</Text> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name={ti.name} size={12} color={ti.color} />
                        <Text style={[styles.driverMeta, { color: ti.color }]}>{driver.trend}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Score Circle */}
                  <View style={[styles.scoreCircle, { borderColor: gc }]}>
                    <Text style={[styles.scoreValue, { color: gc }]}>{driver.score}</Text>
                    <Text style={[styles.scoreGrade, { color: gc }]}>{driver.grade}</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={[styles.driverStats, { borderColor: c.border }]}>
                  <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                    <Text style={[styles.statNum, { color: c.text }]}>{driver.positiveEvents}</Text>
                    <Text style={[styles.statLabel, { color: c.textMuted }]}>Good</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="close-circle" size={14} color={RED} />
                    <Text style={[styles.statNum, { color: c.text }]}>{driver.negativeEvents}</Text>
                    <Text style={[styles.statLabel, { color: c.textMuted }]}>Bad</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                    <Text style={[styles.statNum, { color: c.text }]}>{driver.unresolvedEvents}</Text>
                    <Text style={[styles.statLabel, { color: c.textMuted }]}>Open</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar" size={14} color={BLUE} />
                    <Text style={[styles.statNum, { color: c.text }]}>{driver.last30DaysEvents}</Text>
                    <Text style={[styles.statLabel, { color: c.textMuted }]}>30d</Text>
                  </View>
                  {driver.topCategory ? (
                    <View style={styles.statItem}>
                      <Ionicons name="flag" size={14} color="#f97316" />
                      <Text style={[styles.statNum, { color: c.text, fontSize: 9 }]} numberOfLines={1}>{driver.topCategory}</Text>
                      <Text style={[styles.statLabel, { color: c.textMuted }]}>Top Issue</Text>
                    </View>
                  ) : null}
                </View>

                {/* Passenger Rating Row */}
                {driver.passengerRatingCount > 0 && (
                  <View style={[styles.ratingRow, { borderColor: c.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {[1,2,3,4,5].map(s => (
                        <Ionicons key={s} name={s <= Math.round(driver.averagePassengerRating) ? 'star' : 'star-outline'} size={14} color={GOLD} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: GOLD, marginLeft: 6 }}>{driver.averagePassengerRating}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 4 }}>({driver.passengerRatingCount} rider review{driver.passengerRatingCount !== 1 ? 's' : ''})</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.driverActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: GOLD_LIGHT }]}
                    onPress={(e) => { e.stopPropagation?.(); openRecordModal(driver); }}
                  >
                    <Ionicons name="add-outline" size={14} color={GOLD} />
                    <Text style={[styles.actionBtnText, { color: GOLD }]}>Record Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${BLUE}15` }]}
                    onPress={() => openDriverDetail(driver)}
                  >
                    <Ionicons name="eye-outline" size={14} color={BLUE} />
                    <Text style={[styles.actionBtnText, { color: BLUE }]}>View History</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ====== RECORD EVENT MODAL ====== */}
      <Modal visible={recordModalVisible} animationType="slide" transparent onRequestClose={() => setRecordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Record Behavior Event</Text>
              <TouchableOpacity onPress={() => setRecordModalVisible(false)}>
                <View><Ionicons name="close" size={24} color={c.textMuted} /></View>
              </TouchableOpacity>
            </View>

            {selectedDriver && (
              <View style={[styles.selectedDriverBanner, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Ionicons name="person" size={16} color={GOLD} />
                <Text style={[{ color: c.text, fontWeight: '700', marginLeft: 8 }]}>{selectedDriver.driverName}</Text>
              </View>
            )}

            {/* Driver picker (if coming from header add button) */}
            {!selectedDriver && scoreboard.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.formLabel, { color: c.textMuted }]}>Select Driver</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {scoreboard.map(d => (
                    <TouchableOpacity
                      key={d.driverId}
                      style={[styles.driverChip, selectedDriver?.driverId === d.driverId && { backgroundColor: GOLD, borderColor: GOLD }, { borderColor: c.border }]}
                      onPress={() => setSelectedDriver(d)}
                    >
                      <Text style={[{ fontSize: 12, fontWeight: '600' }, selectedDriver?.driverId === d.driverId ? { color: '#000' } : { color: c.text }]}>{d.driverName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.formLabel, { color: c.textMuted }]}>Category</Text>
            <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
              <View style={styles.categoryGrid}>
                {BEHAVIOR_CATEGORIES.map(cat => {
                  const isSelected = selectedCategory?.key === cat.key;
                  const catColor = cat.type === 'Positive' ? GREEN : cat.type === 'Negative' ? RED : '#6b7280';
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryChip,
                        { borderColor: isSelected ? catColor : c.border, backgroundColor: isSelected ? `${catColor}15` : c.surface }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Ionicons name={cat.icon} size={16} color={catColor} />
                      <Text style={[styles.categoryLabel, { color: isSelected ? catColor : c.text }]}>{cat.label}</Text>
                      <Text style={[styles.categoryPoints, { color: catColor }]}>
                        {cat.points > 0 ? `+${cat.points}` : cat.points}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.formLabel, { color: c.textMuted }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              placeholderTextColor={c.textMuted}
              placeholder="Details about the event..."
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
            />

            <Text style={[styles.formLabel, { color: c.textMuted }]}>Location (optional)</Text>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              placeholderTextColor={c.textMuted}
              placeholder="e.g. N1 Highway, Johannesburg"
              value={eventLocation}
              onChangeText={setEventLocation}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
              onPress={handleRecordEvent}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#000" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                  <Text style={styles.submitBtnText}>Record Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ====== DRIVER DETAIL MODAL ====== */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                {detailDriver?.driverName || 'Driver'} - History
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <View><Ionicons name="close" size={24} color={c.textMuted} /></View>
              </TouchableOpacity>
            </View>

            {detailDriver && (
              <View style={[styles.detailScoreBanner, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.detailScoreCircle, { borderColor: gradeColor(detailDriver.grade) }]}>
                  <Text style={[styles.detailScoreNum, { color: gradeColor(detailDriver.grade) }]}>{detailDriver.score}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[{ fontWeight: '800', fontSize: 16, color: c.text }]}>Grade: {detailDriver.grade}</Text>
                  <Text style={[{ fontSize: 12, color: c.textMuted, marginTop: 2 }]}>
                    {detailDriver.positiveEvents} positive · {detailDriver.negativeEvents} negative · {detailDriver.unresolvedEvents} unresolved
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name={trendIcon(detailDriver.trend).name} size={16} color={trendIcon(detailDriver.trend).color} />
                  <Text style={{ color: trendIcon(detailDriver.trend).color, fontWeight: '700', fontSize: 12 }}>{detailDriver.trend}</Text>
                </View>
              </View>
            )}

            {loadingEvents ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={GOLD} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                {/* Passenger Ratings Section */}
                {driverRatingsData && driverRatingsData.totalRatings > 0 && (
                  <>
                    <View style={[styles.ratingsSummaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={{ alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Passenger Ratings</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {[1,2,3,4,5].map(s => (
                            <Ionicons key={s} name={s <= Math.round(driverRatingsData.averageRating) ? 'star' : 'star-outline'} size={22} color={GOLD} />
                          ))}
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: GOLD, marginTop: 4 }}>{driverRatingsData.averageRating}/5</Text>
                        <Text style={{ fontSize: 12, color: c.textMuted }}>{driverRatingsData.totalRatings} rider review{driverRatingsData.totalRatings !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    {driverRatingsData.ratings?.map((rev) => (
                      <View key={rev.id} style={[styles.eventCard, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: GOLD, borderLeftWidth: 3 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="person-circle-outline" size={18} color={GOLD} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', color: c.text }}>{rev.passengerName}</Text>
                            <Text style={{ fontSize: 11, color: c.textMuted }}>{fmtDate(rev.createdAt)} · {rev.route}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <Ionicons key={s} name={s <= rev.rating ? 'star' : 'star-outline'} size={12} color={GOLD} />
                            ))}
                          </View>
                        </View>
                        {rev.comments ? <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4, fontStyle: 'italic' }}>"{rev.comments}"</Text> : null}
                      </View>
                    ))}
                  </>
                )}

                {/* Behavior Events Section */}
                {driverEvents.length === 0 && (!driverRatingsData || driverRatingsData.totalRatings === 0) ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Ionicons name="checkmark-done-circle-outline" size={48} color={c.textMuted} />
                    <Text style={{ color: c.text, fontWeight: '700', marginTop: 8 }}>Clean Record</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>No behavior events recorded</Text>
                  </View>
                ) : driverEvents.length > 0 ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 12, marginBottom: 6 }}>
                      <Ionicons name="list-outline" size={16} color={c.textMuted} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>Behavior Events ({driverEvents.length})</Text>
                    </View>
                {driverEvents.map((item) => {
                  const isPositive = item.eventType === 'Positive';
                  const evColor = isPositive ? GREEN : RED;
                  const catDef = BEHAVIOR_CATEGORIES.find(x => x.key === item.category);
                  return (
                    <View key={item.id} style={[styles.eventCard, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: evColor, borderLeftWidth: 3 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={catDef?.icon || 'ellipsis-horizontal'} size={18} color={evColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={[{ fontWeight: '700', color: c.text }]}>{item.category}</Text>
                          <Text style={[{ fontSize: 11, color: c.textMuted }]}>{fmtDate(item.eventDate)} · {item.severity}</Text>
                        </View>
                        <View style={[styles.pointsBadge, { backgroundColor: isPositive ? `${GREEN}15` : `${RED}15` }]}>
                          <Text style={{ fontWeight: '800', fontSize: 12, color: evColor }}>
                            {item.pointsImpact > 0 ? `+${item.pointsImpact}` : item.pointsImpact}
                          </Text>
                        </View>
                      </View>
                      {item.description ? <Text style={[{ fontSize: 12, color: c.textMuted, marginTop: 4 }]}>{item.description}</Text> : null}
                      {item.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="location-outline" size={12} color={c.textMuted} />
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{item.location}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        {item.isResolved ? (
                          <View style={[styles.resolvedBadge, { backgroundColor: `${GREEN}15` }]}>
                            <Ionicons name="checkmark-circle" size={12} color={GREEN} />
                            <Text style={{ fontSize: 10, color: GREEN, fontWeight: '600' }}>Resolved</Text>
                          </View>
                        ) : !isPositive ? (
                          <TouchableOpacity
                            style={[styles.resolveBtn, { borderColor: GOLD }]}
                            onPress={() => handleResolveEvent(item.id)}
                          >
                            <Ionicons name="checkmark" size={12} color={GOLD} />
                            <Text style={{ fontSize: 10, color: GOLD, fontWeight: '700' }}>Resolve</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                  </>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  addBtn: { padding: 6 },

  body: { padding: 16, paddingBottom: 32 },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  summaryCard: { width: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptySub: { fontSize: 12, textAlign: 'center' },

  driverCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  driverCardTop: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 14, fontWeight: '900' },
  driverName: { fontSize: 15, fontWeight: '800' },
  driverMeta: { fontSize: 11, fontWeight: '500' },

  scoreCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  scoreGrade: { fontSize: 10, fontWeight: '800' },

  driverStats: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 13, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600' },

  driverActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900' },

  selectedDriverBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  formLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  categoryPoints: { fontSize: 10, fontWeight: '800' },

  driverChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, marginRight: 8 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, minHeight: 44 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  // Detail modal
  detailScoreBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  detailScoreCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  detailScoreNum: { fontSize: 18, fontWeight: '900' },

  eventCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  pointsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginTop: 8, paddingHorizontal: 4 },
  ratingsSummaryCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
});
