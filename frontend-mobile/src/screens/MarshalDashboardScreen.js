import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { client } from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';
const BLUE = '#007bff';

export default function MarshalDashboardScreen({ navigation }) {
  const { colors: c } = useTheme();
  
  // State
  const [marshal, setMarshal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [capturedTrips, setCapturedTrips] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({
    todayTrips: 0,
    pendingMessages: 0,
    activeSchedules: 0
  });

  useEffect(() => {
    loadMarshalData();
  }, []);

  const loadMarshalData = async () => {
    try {
      setLoading(true);
      
      // Get marshal session
      const sessionStr = await AsyncStorage.getItem('marshalSession');
      if (!sessionStr) {
        navigation.replace('MarshalLogin');
        return;
      }
      
      const session = JSON.parse(sessionStr);
      setMarshal(session);
      
      // Load dashboard data
      await Promise.all([
        loadTodaySchedules(session),
        loadCapturedTrips(session),
        loadMessages(session),
        loadStats(session)
      ]);
      
    } catch (error) {
      console.error('Load marshal data error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySchedules = async (session) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await client.get(`/TripSchedules/by-rank/${session.taxiRankId}`, {
        params: { date: today }
      });
      setTodaySchedules(response.data || []);
    } catch (error) {
      console.warn('Load schedules error:', error);
      setTodaySchedules([]);
    }
  };

  const loadCapturedTrips = async (session) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await client.get(`/TripCaptures/by-marshal/${session.id}`, {
        params: { date: today }
      });
      setCapturedTrips(response.data || []);
    } catch (error) {
      console.warn('Load captured trips error:', error);
      setCapturedTrips([]);
    }
  };

  const loadMessages = async (session) => {
    try {
      const response = await client.get(`/Messages/by-marshal/${session.id}`);
      setMessages(response.data || []);
    } catch (error) {
      console.warn('Load messages error:', error);
      setMessages([]);
    }
  };

  const loadStats = async (session) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await client.get(`/QueueMarshals/${session.id}/stats`, {
        params: { date: today }
      });
      setStats(response.data || {
        todayTrips: 0,
        pendingMessages: 0,
        activeSchedules: 0
      });
    } catch (error) {
      console.warn('Load stats error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMarshalData();
    setRefreshing(false);
  }, []);

  const captureTrip = () => {
    if (!marshal?.permissions?.canCaptureTrips) {
      Alert.alert('Access Denied', 'You do not have permission to capture trips');
      return;
    }
    navigation.navigate('TripCapture', { marshal });
  };

  const viewSchedules = () => {
    if (!marshal?.permissions?.canViewSchedules) {
      Alert.alert('Access Denied', 'You do not have permission to view schedules');
      return;
    }
    navigation.navigate('MarshalSchedules', { marshal });
  };

  const viewMessages = () => {
    if (!marshal?.permissions?.canReceiveMessages) {
      Alert.alert('Access Denied', 'You do not have permission to receive messages');
      return;
    }
    navigation.navigate('MarshalMessages', { marshal });
  };

  const sendMessage = () => {
    if (!marshal?.permissions?.canSendMessages) {
      Alert.alert('Access Denied', 'You do not have permission to send messages');
      return;
    }
    navigation.navigate('MarshalComposeMessage', { marshal });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return GREEN;
      case 'In Progress': return BLUE;
      case 'Pending': return GOLD;
      case 'Cancelled': return RED;
      default: return c.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Queue Marshal Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.text }]}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Marshal Dashboard</Text>
          <Text style={styles.headerSubtitle}>{marshal?.fullName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.marshalBadge}>
            <Ionicons name="shield-outline" size={16} color={GOLD} />
            <Text style={styles.marshalCode}>{marshal?.marshalCode}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GOLD]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={captureTrip}>
            <Ionicons name="add-circle-outline" size={24} color={GOLD} />
            <Text style={[styles.statNumber, { color: c.text }]}>{stats.todayTrips}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Today's Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={viewMessages}>
            <Ionicons name="chatbubble-outline" size={24} color={BLUE} />
            <Text style={[styles.statNumber, { color: c.text }]}>{stats.pendingMessages}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={viewSchedules}>
            <Ionicons name="calendar-outline" size={24} color={GREEN} />
            <Text style={[styles.statNumber, { color: c.text }]}>{stats.activeSchedules}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Active Schedules</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={captureTrip}>
              <Ionicons name="camera-outline" size={32} color={GOLD} />
              <Text style={[styles.actionTitle, { color: c.text }]}>Capture Trip</Text>
              <Text style={[styles.actionSubtitle, { color: c.textMuted }]}>Record a new trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={viewSchedules}>
              <Ionicons name="list-outline" size={32} color={GREEN} />
              <Text style={[styles.actionTitle, { color: c.text }]}>View Schedules</Text>
              <Text style={[styles.actionSubtitle, { color: c.textMuted }]}>Today's schedules</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={viewMessages}>
              <Ionicons name="mail-outline" size={32} color={BLUE} />
              <Text style={[styles.actionTitle, { color: c.text }]}>Messages</Text>
              <Text style={[styles.actionSubtitle, { color: c.textMuted }]}>Inbox & sent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]} onPress={sendMessage}>
              <Ionicons name="send-outline" size={32} color={GOLD} />
              <Text style={[styles.actionTitle, { color: c.text }]}>Send Message</Text>
              <Text style={[styles.actionSubtitle, { color: c.textMuted }]}>Compose new</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Today's Schedules</Text>
            <TouchableOpacity onPress={viewSchedules}>
              <Text style={[styles.viewAllText, { color: GOLD }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {todaySchedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No schedules for today</Text>
            </View>
          ) : (
            todaySchedules.slice(0, 3).map((schedule) => (
              <View key={schedule.id} style={[styles.scheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.scheduleHeader}>
                  <Text style={[styles.scheduleTime, { color: c.text }]}>
                    {formatTime(schedule.departureTime)}
                  </Text>
                  <Text style={[styles.scheduleRoute, { color: c.text }]}>
                    {schedule.routeName}
                  </Text>
                </View>
                <Text style={[styles.schedulePath, { color: c.textMuted }]}>
                  {schedule.departureStation} → {schedule.destinationStation}
                </Text>
                <View style={styles.scheduleFooter}>
                  <Text style={[styles.scheduleFare, { color: c.text }]}>R{schedule.standardFare}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: schedule.isActive ? GREEN_LIGHT : '#ccc' }]}>
                    <Text style={[styles.statusText, { color: schedule.isActive ? GREEN : '#666' }]}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Captured Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Captures</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TripHistory', { marshal })}>
              <Text style={[styles.viewAllText, { color: GOLD }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {capturedTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="camera-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No trips captured today</Text>
            </View>
          ) : (
            capturedTrips.slice(0, 3).map((trip) => (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.tripHeader}>
                  <Text style={[styles.tripTime, { color: c.text }]}>
                    {formatTime(trip.capturedAt)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(trip.status) }]}>
                      {trip.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tripRoute, { color: c.text }]}>{trip.routeName}</Text>
                <Text style={[styles.tripDetails, { color: c.textMuted }]}>
                  {trip.vehicleRegistration} • {trip.passengerCount} passengers
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Recent Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Messages</Text>
            <TouchableOpacity onPress={viewMessages}>
              <Text style={[styles.viewAllText, { color: GOLD }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No messages</Text>
            </View>
          ) : (
            messages.slice(0, 3).map((message) => (
              <View key={message.id} style={[styles.messageCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageSender, { color: c.text }]}>{message.senderName}</Text>
                  <Text style={[styles.messageTime, { color: c.textMuted }]}>
                    {formatDate(message.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.messagePreview, { color: c.text }]} numberOfLines={2}>
                  {message.content}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const GREEN_LIGHT = '#d4edda';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: GOLD, fontSize: 12, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  marshalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD
  },
  marshalCode: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700'
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },

  content: { flex: 1, paddingHorizontal: 20 },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 4
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center'
  },

  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600'
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center'
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },

  scheduleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '700'
  },
  scheduleRoute: {
    fontSize: 14,
    fontWeight: '600'
  },
  schedulePath: {
    fontSize: 13,
    marginBottom: 12
  },
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scheduleFare: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600'
  },

  tripCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  tripTime: {
    fontSize: 14,
    fontWeight: '600'
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  tripDetails: {
    fontSize: 12
  },

  messageCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600'
  },
  messageTime: {
    fontSize: 12
  },
  messagePreview: {
    fontSize: 13,
    lineHeight: 18
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8
  }
});
