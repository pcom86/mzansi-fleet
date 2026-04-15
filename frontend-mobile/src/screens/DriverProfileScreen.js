import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';

const RATING_COLORS = {
  5: '#22c55e',
  4: '#22c55e',
  3: '#f59e0b',
  2: '#ef4444',
  1: '#ef4444',
};

function StarRating({ rating, size = 20 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? GOLD : '#e2e8f0'}
        />
      ))}
      <Text style={{ fontSize: size * 0.9, fontWeight: '700', color: RATING_COLORS[Math.round(rating)] || '#64748b', marginLeft: 8 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

function StatCard({ icon, label, value, color, subValue }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subValue && <Text style={styles.statSub}>{subValue}</Text>}
      </View>
    </View>
  );
}

export default function DriverProfileScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const c = useAppTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStats, setDriverStats] = useState(null);

  useEffect(() => {
    if (driverId) {
      loadDriverStats();
    }
  }, [driverId]);

  const loadDriverStats = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/DriverRating/stats/${driverId}`);
      setDriverStats(res.data);
    } catch (e) {
      console.error('Load driver stats error:', e);
      Alert.alert('Error', 'Failed to load driver statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDriverStats();
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#22c55e';
    if (rank <= 3) return '#f59e0b';
    if (rank <= 10) return '#3b82f6';
    return '#64748b';
  };

  const getRankLabel = (rank) => {
    if (rank === 1) return '🏆 Top Driver';
    if (rank === 2) return '🥈 Excellent';
    if (rank === 3) return '🥉 Great';
    if (rank <= 10) return '⭐ Top 10';
    return '📈 Rising';
  };

  if (!driverId) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={c.textMuted} />
          <Text style={[styles.errorTitle, { color: c.text }]}>Driver ID Required</Text>
          <Text style={[styles.errorSub, { color: c.textMuted }]}>Please provide a driver ID to view profile.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading driver profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <Text style={styles.headerSub}>Performance statistics</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Rating Overview */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.ratingHeader}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Overall Rating</Text>
            <View style={styles.ratingBadge}>
              <StarRating rating={driverStats.averageRating} />
            </View>
          </View>
          
          {driverStats.rankPosition && (
            <View style={styles.rankContainer}>
              <View style={[styles.rankBadge, { backgroundColor: getRankColor(driverStats.rankPosition) + '15' }]}>
                <Text style={[styles.rankNumber, { color: getRankColor(driverStats.rankPosition) }]}>
                  #{driverStats.rankPosition}
                </Text>
              </View>
              <Text style={[styles.rankLabel, { color: c.text }]}>
                {getRankLabel(driverStats.rankPosition)}
              </Text>
              <Text style={[styles.rankSub, { color: c.textMuted }]}>
                of {driverStats.totalDrivers} drivers
              </Text>
            </View>
          )}
        </View>

        {/* Performance Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="star-outline"
            label="Total Reviews"
            value={driverStats.totalReviews}
            color="#f59e0b"
          />
          <StatCard
            icon="car-outline"
            label="Total Trips"
            value={driverStats.totalTrips}
            color="#3b82f6"
          />
          <StatCard
            icon="trending-up-outline"
            label="Avg Rating"
            value={driverStats.averageRating.toFixed(1)}
            color="#22c55e"
            subValue="out of 5"
          />
        </View>

        {/* Performance Chart */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Performance Breakdown</Text>
          
          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={[styles.performanceLabel, { color: c.text }]}>Excellent (5⭐)</Text>
              <Text style={[styles.performancePercent, { color: '#22c55e' }]}>85%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { backgroundColor: '#22c55e', width: '85%' }]} />
            </View>
          </View>

          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={[styles.performanceLabel, { color: c.text }]}>Good (4⭐)</Text>
              <Text style={[styles.performancePercent, { color: '#22c55e' }]}>10%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { backgroundColor: '#22c55e', width: '10%' }]} />
            </View>
          </View>

          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={[styles.performanceLabel, { color: c.text }]}>Average (3⭐)</Text>
              <Text style={[styles.performancePercent, { color: '#f59e0b' }]}>4%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { backgroundColor: '#f59e0b', width: '4%' }]} />
            </View>
          </View>

          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={[styles.performanceLabel, { color: c.text }]}>Poor (2⭐)</Text>
              <Text style={[styles.performancePercent, { color: '#ef4444' }]}>1%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { backgroundColor: '#ef4444', width: '1%' }]} />
            </View>
          </View>
        </View>

        {/* Last Update */}
        {driverStats.lastRatingUpdate && (
          <View style={styles.updateInfo}>
            <Ionicons name="time-outline" size={14} color={c.textMuted} />
            <Text style={[styles.updateText, { color: c.textMuted }]}>
              Last updated: {new Date(driverStats.lastRatingUpdate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
  },
  backBtn: { padding: 8 },
  refreshBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  card: {
    borderRadius: 12, borderWidth: 1, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  
  ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  
  rankContainer: { alignItems: 'center', marginTop: 16 },
  rankBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginBottom: 8,
  },
  rankNumber: { fontSize: 20, fontWeight: '900' },
  rankLabel: { fontSize: 16, fontWeight: '700' },
  rankSub: { fontSize: 12, marginTop: 4 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  statContent: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statSub: { fontSize: 10, color: '#94a3b8' },

  performanceItem: { marginBottom: 16 },
  performanceHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  performanceLabel: { fontSize: 14, fontWeight: '500' },
  performancePercent: { fontSize: 14, fontWeight: '700' },
  progressBar: {
    height: 8, backgroundColor: '#f1f5f9', borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  updateInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 16,
  },
  updateText: { fontSize: 12, marginLeft: 4 },
});
