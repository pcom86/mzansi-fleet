import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';

const RATING_COLORS = {
  5: '#22c55e',
  4: '#22c55e',
  3: '#f59e0b',
  2: '#ef4444',
  1: '#ef4444',
};

function RankBadge({ rank, size = 24 }) {
  if (rank === 1) {
    return <View style={[styles.rankBadge, { backgroundColor: GOLD, width: size, height: size }]}>
      <Text style={[styles.rankText, { fontSize: size * 0.5, color: '#000' }]}>1</Text>
    </View>;
  }
  if (rank === 2) {
    return <View style={[styles.rankBadge, { backgroundColor: SILVER, width: size, height: size }]}>
      <Text style={[styles.rankText, { fontSize: size * 0.5, color: '#000' }]}>2</Text>
    </View>;
  }
  if (rank === 3) {
    return <View style={[styles.rankBadge, { backgroundColor: BRONZE, width: size, height: size }]}>
      <Text style={[styles.rankText, { fontSize: size * 0.5, color: '#fff' }]}>3</Text>
    </View>;
  }
  return <View style={[styles.rankBadge, { backgroundColor: '#64748b', width: size, height: size }]}>
    <Text style={[styles.rankText, { fontSize: size * 0.4 }]}>{rank}</Text>
  </View>;
}

function StarRating({ rating, size = 14 }) {
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
      <Text style={{ fontSize: size * 0.8, fontWeight: '600', color: RATING_COLORS[Math.round(rating)] || '#64748b', marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

export default function DriverLeaderboardScreen({ navigation }) {
  const { user } = useAuth();
  const c = useAppTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedTaxiRank, setSelectedTaxiRank] = useState(null);
  const [taxiRanks, setTaxiRanks] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedTaxiRank]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load taxi ranks if not already loaded
      if (taxiRanks.length === 0) {
        const ranksRes = await client.get('/TaxiRanks');
        setTaxiRanks(ranksRes.data || []);
      }

      // Load leaderboard
      const params = selectedTaxiRank ? { taxiRankId: selectedTaxiRank.id } : {};
      const leaderboardRes = await client.get('/DriverRating/leaderboard', { params });
      setLeaderboard(leaderboardRes.data || []);
    } catch (e) {
      console.error('Load leaderboard error:', e);
      Alert.alert('Error', 'Failed to load driver leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const renderDriverItem = (driver, index) => {
    const isTop3 = index < 3;
    const ratingColor = RATING_COLORS[Math.round(driver.averageRating)] || '#64748b';

    return (
      <View key={driver.driverId} style={[styles.driverCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.driverHeader}>
          <View style={styles.rankSection}>
            <RankBadge rank={driver.rank} size={32} />
            {isTop3 && <Text style={[styles.topBadge, { backgroundColor: ratingColor }]}>TOP {driver.rank}</Text>}
          </View>
          
          <View style={styles.driverInfo}>
            <View style={styles.driverNameRow}>
              <Text style={[styles.driverName, { color: c.text }]}>{driver.driverName}</Text>
              <View style={styles.ratingBadge}>
                <StarRating rating={driver.averageRating} size={12} />
              </View>
            </View>
            
            <View style={styles.driverMeta}>
              <Text style={[styles.vehicleInfo, { color: c.textMuted }]}>
                <Ionicons name="car-outline" size={12} color={c.textMuted} />
                {' '}{driver.vehicleRegistration}
              </Text>
              <Text style={[styles.taxiRankInfo, { color: c.textMuted }]}>
                <Ionicons name="location-outline" size={12} color={c.textMuted} />
                {' '}{driver.taxiRankName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ratingColor }]}>{driver.totalReviews}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.text }]}>{driver.totalTrips}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ratingColor }]}>{(driver.averageRating).toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Rating</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Driver Leaderboard</Text>
          <Text style={styles.headerSub}>Top performing drivers</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Taxi Rank Filter */}
      {taxiRanks.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: c.text }]}>Filter by Taxi Rank:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rankFilterScroll}>
            <TouchableOpacity
              style={[styles.rankFilterChip, { backgroundColor: !selectedTaxiRank ? GOLD : c.surface, borderColor: c.border }]}
              onPress={() => setSelectedTaxiRank(null)}
            >
              <Text style={[styles.rankFilterText, { color: !selectedTaxiRank ? '#000' : c.text }]}>
                All Ranks
              </Text>
            </TouchableOpacity>
            {taxiRanks.map(rank => (
              <TouchableOpacity
                key={rank.id}
                style={[styles.rankFilterChip, { backgroundColor: selectedTaxiRank?.id === rank.id ? GOLD : c.surface, borderColor: c.border }]}
                onPress={() => setSelectedTaxiRank(rank)}
              >
                <Text style={[styles.rankFilterText, { color: selectedTaxiRank?.id === rank.id ? '#000' : c.text }]}>
                  {rank.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading leaderboard...</Text>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Drivers Found</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>
            {selectedTaxiRank ? 'No drivers have ratings for this taxi rank yet.' : 'No drivers have ratings yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          {leaderboard.map((driver, index) => renderDriverItem(driver, index))}
        </ScrollView>
      )}
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
  
  filterSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  rankFilterScroll: { },
  rankFilterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, marginRight: 8,
  },
  rankFilterText: { fontSize: 12, fontWeight: '500' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  driverCard: {
    borderRadius: 12, borderWidth: 1, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  driverHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  rankSection: { alignItems: 'center', marginRight: 12 },
  rankBadge: {
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontWeight: '900' },
  topBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    marginTop: 4,
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  driverName: { fontSize: 16, fontWeight: '700', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  driverMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleInfo: { fontSize: 12, flexDirection: 'row', alignItems: 'center' },
  taxiRankInfo: { fontSize: 12, flexDirection: 'row', alignItems: 'center' },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9', marginHorizontal: 8 },
});
