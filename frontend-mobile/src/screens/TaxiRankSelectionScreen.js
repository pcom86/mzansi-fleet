import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Alert, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#22c55e';

export default function TaxiRankSelectionScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const params = route.params || {};
  const {
    pickupAddress = '',
    destinationAddress = '',
    pickupCoords = null,
    destCoords = null,
    nearbyRanks = []
  } = params;

  const [loading, setLoading] = useState(false);
  const [rankRoutes, setRankRoutes] = useState({});
  const [selectedRank, setSelectedRank] = useState(null);

  useEffect(() => {
    if (nearbyRanks.length > 0) {
      loadRoutesForRanks(nearbyRanks);
    }
  }, [nearbyRanks]);

  const loadRoutesForRanks = async (ranks) => {
    setLoading(true);
    const routesMap = {};
    
    try {
      // Load routes for each rank
      for (const rank of ranks) {
        try {
          const response = await client.get(`/Routes/by-rank/${rank.id}`);
          const routes = response.data || [];
          routesMap[rank.id] = routes;
        } catch (err) {
          console.warn(`Failed to load routes for rank ${rank.id}:`, err);
          routesMap[rank.id] = [];
        }
      }
      setRankRoutes(routesMap);
    } catch (err) {
      console.error('Error loading routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectRank = (rank) => {
    setSelectedRank(rank);
  };

  const handleContinue = () => {
    if (!selectedRank) {
      Alert.alert('Required', 'Please select a taxi rank');
      return;
    }

    // Navigate to RiderTripBrowser with the selected rank
    navigation.navigate('RiderTripBrowser', {
      preSelectedRankId: selectedRank.id,
      pickupAddress,
      destinationAddress,
      pickupCoords,
      destCoords
    });
  };

  const renderRankCard = ({ item: rank }) => {
    const routes = rankRoutes[rank.id] || [];
    const isSelected = selectedRank?.id === rank.id;

    return (
      <TouchableOpacity
        style={[
          styles.rankCard,
          { backgroundColor: c.surface, borderColor: isSelected ? GOLD : c.border },
          isSelected && { borderWidth: 2 }
        ]}
        onPress={() => selectRank(rank)}
        activeOpacity={0.85}
      >
        {/* Rank Header */}
        <View style={styles.rankHeader}>
          <View style={styles.rankInfo}>
            <View style={[styles.rankIcon, { backgroundColor: GOLD_LIGHT }]}>
              <Ionicons name="business" size={20} color={GOLD} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rankName, { color: c.text }]}>{rank.name}</Text>
              <Text style={[styles.rankLocation, { color: c.textMuted }]}>
                {rank.city || rank.province || rank.address || 'Taxi Rank'}
              </Text>
            </View>
          </View>
          {isSelected && (
            <View style={[styles.checkBadge, { backgroundColor: GOLD }]}>
              <Ionicons name="checkmark" size={16} color="#000" />
            </View>
          )}
        </View>

        {/* Distance */}
        <View style={styles.distanceRow}>
          <Ionicons name="navigate" size={14} color={GOLD} />
          <Text style={[styles.distanceText, { color: c.textMuted }]}>
            {rank.distanceKm} km away
          </Text>
        </View>

        {/* Routes */}
        {routes.length > 0 ? (
          <View style={styles.routesSection}>
            <Text style={[styles.routesLabel, { color: c.textMuted }]}>
              Available Routes ({routes.length})
            </Text>
            {routes.slice(0, 3).map((route, idx) => (
              <View key={route.id || idx} style={styles.routeItem}>
                <Ionicons name="map" size={14} color={c.textMuted} />
                <Text style={[styles.routeText, { color: c.text }]}>
                  {route.routeName || `${route.departureStation} → ${route.destinationStation}`}
                </Text>
              </View>
            ))}
            {routes.length > 3 && (
              <Text style={[styles.moreText, { color: GOLD }]}>
                +{routes.length - 3} more routes
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noRoutes}>
            <Ionicons name="alert-circle" size={14} color={c.textMuted} />
            <Text style={[styles.noRoutesText, { color: c.textMuted }]}>
              No routes available
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Select Taxi Rank</Text>
          <Text style={styles.headerSub}>Choose from nearby ranks</Text>
        </View>
      </View>

      {/* Route Summary */}
      <View style={[styles.routeSummary, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: GOLD }]} />
          <Text style={[styles.summaryText, { color: c.text }]} numberOfLines={1}>
            {pickupAddress}
          </Text>
        </View>
        <View style={styles.summaryLine} />
        <View style={styles.summaryRow}>
          <View style={[styles.summaryDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.summaryText, { color: c.text }]} numberOfLines={1}>
            {destinationAddress}
          </Text>
        </View>
      </View>

      {/* Ranks List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>
            Loading taxi ranks...
          </Text>
        </View>
      ) : nearbyRanks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={64} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Taxi Ranks Found</Text>
          <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
            Try adjusting your pickup address
          </Text>
        </View>
      ) : (
        <FlatList
          data={nearbyRanks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderRankCard}
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: selectedRank ? GOLD : c.border }]}
                onPress={handleContinue}
                disabled={!selectedRank}
              >
                <Text style={[styles.continueBtnText, { color: selectedRank ? '#000' : c.textMuted }]}>
                  Continue with {selectedRank?.name || 'Selected Rank'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={selectedRank ? '#000' : c.textMuted} />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: GOLD,
    marginTop: 2,
    fontWeight: '600',
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  summaryLine: {
    width: 2,
    height: 20,
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  rankCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankName: {
    fontSize: 16,
    fontWeight: '800',
  },
  rankLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  routesSection: {
    marginTop: 8,
  },
  routesLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  noRoutes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  noRoutesText: {
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  continueBtn: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },
});
