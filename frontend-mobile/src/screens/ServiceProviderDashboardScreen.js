import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getMyServiceProviderProfile, toggleServiceProviderAvailability } from '../api/serviceProviderProfiles';
import { getMyProviderBookings } from '../api/maintenance';
import { LinearGradient } from 'expo-linear-gradient';
import ThemeToggle from '../components/ThemeToggle';

export default function ServiceProviderDashboardScreen({ navigation }) {
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const { signOut } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState({ total: 0, thisMonth: 0, jobsCompleted: 0 });
  const [bookingStats, setBookingStats] = useState({ today: 0, total: 0 });

  const load = useCallback(async () => {
    try {
      const [profileData, bookingsData] = await Promise.all([
        getMyServiceProviderProfile(),
        getMyProviderBookings().catch(() => [])
      ]);
      
      setProfile(profileData || null);
      
      // Calculate earnings and booking stats
      if (Array.isArray(bookingsData)) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const completedJobs = bookingsData.filter(b => b.state === 'Completed');
        const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.serviceCost || b.ServiceCost || b.repairCost || 0), 0);
        
        const thisMonthJobs = completedJobs.filter(b => {
          const date = new Date(b.completedDate || b.scheduledDate || b.createdAt);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const thisMonthEarnings = thisMonthJobs.reduce((sum, b) => sum + (b.serviceCost || b.ServiceCost || b.repairCost || 0), 0);
        
        // Calculate booking statistics
        const scheduledBookings = bookingsData.filter(b => b.state === 'Scheduled');
        const todayBookings = scheduledBookings.filter(b => {
          const scheduledDate = new Date(b.scheduledDate);
          return scheduledDate >= today && scheduledDate < tomorrow;
        });
        
        setEarnings({
          total: totalEarnings,
          thisMonth: thisMonthEarnings,
          jobsCompleted: completedJobs.length
        });
        
        setBookingStats({
          today: todayBookings.length,
          total: scheduledBookings.length
        });
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setProfile(null);
      } else {
        Alert.alert('Error', err?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onToggleAvailability() {
    if (!profile?.id) return;
    try {
      const updated = await toggleServiceProviderAvailability(profile.id);
      setProfile(updated || profile);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not update availability');
    }
  }

  function onToggleTheme() {
    setMode(mode === 'light' ? 'dark' : 'light');
  }

  async function onLogout() {
    try {
      await signOut();
    } catch {}
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={styles.muted}>Loading service provider dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
    >
      <LinearGradient
        colors={[c.primary, c.primary + 'dd', c.primary + '99']}
        style={styles.heroSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.avatarText}>{(profile?.businessName || 'S')[0].toUpperCase()}</Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#ef4444' }]} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>{profile?.businessName || 'Service Provider'}</Text>
              <Text style={styles.email}>{profile?.email || 'No email available'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.ratingText}>{profile?.rating ? profile.rating.toFixed(1) : '0.0'}</Text>
                <Text style={styles.reviewCount}>({profile?.totalReviews || 0} reviews)</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={onToggleAvailability}>
              <Ionicons name={profile?.isAvailable ? 'radio-button-on' : 'radio-button-off'} size={20} color="#fff" />
              <Text style={styles.quickActionText}>{profile?.isAvailable ? 'Available' : 'Unavailable'}</Text>
            </TouchableOpacity>
            <View style={[styles.quickActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemeToggle showBackground={false} size={20} />
            </View>
          </View>
        </View>
      </LinearGradient>


      {!profile && (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={c.textMuted} />
          <Text style={styles.emptyTitle}>Profile not found</Text>
          <Text style={styles.emptySub}>Complete registration to unlock service provider tools.</Text>
        </View>
      )}

      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Business Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' + '20' }]}>
              <Ionicons name="build-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{countCsv(profile?.serviceTypes)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Services</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
              <Ionicons name="car-sport-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{countCsv(profile?.vehicleCategories)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Vehicle Types</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' + '20' }]}>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{profile?.rating ? profile.rating.toFixed(1) : '0.0'}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Rating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#10b981' + '20' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#10b981" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{profile?.totalReviews || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Reviews</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={c.primary} />
          <Text style={styles.cardTitle}>Bookings Overview</Text>
        </View>
        <View style={styles.bookingStatsContainer}>
          <View style={styles.bookingStatItem}>
            <View style={[styles.bookingStatIcon, { backgroundColor: '#22c55e' + '20' }]}>
              <Ionicons name="today-outline" size={20} color="#22c55e" />
            </View>
            <View style={styles.bookingStatContent}>
              <Text style={[styles.bookingStatValue, { color: c.text }]}>{bookingStats.today}</Text>
              <Text style={[styles.bookingStatLabel, { color: c.textMuted }]}>Today's Bookings</Text>
            </View>
          </View>
          <View style={styles.bookingStatDivider} />
          <View style={styles.bookingStatItem}>
            <View style={[styles.bookingStatIcon, { backgroundColor: '#3b82f6' + '20' }]}>
              <Ionicons name="list-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.bookingStatContent}>
              <Text style={[styles.bookingStatValue, { color: c.text }]}>{bookingStats.total}</Text>
              <Text style={[styles.bookingStatLabel, { color: c.textMuted }]}>Total Scheduled</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.viewAllBtn, { backgroundColor: c.primary + '10', borderColor: c.primary, marginTop: 12 }]}
          onPress={() => navigation.navigate('SPBookings')}
        >
          <Text style={[styles.viewAllBtnText, { color: c.primary }]}>View All Bookings</Text>
          <Ionicons name="arrow-forward" size={16} color={c.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={18} color={c.primary} />
          <Text style={styles.cardTitle}>Business Details</Text>
        </View>
        <InfoRow icon="person-outline" label="Contact Person" value={profile?.contactPerson || 'Not provided'} styles={styles} c={c} />
        <InfoRow icon="call-outline" label="Phone" value={profile?.phone || 'Not provided'} styles={styles} c={c} />
        <InfoRow icon="location-outline" label="Address" value={profile?.address || 'Not provided'} styles={styles} c={c} />
        <InfoRow icon="time-outline" label="Operating Hours" value={profile?.operatingHours || 'Not provided'} styles={styles} c={c} />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash-outline" size={18} color={c.primary} />
          <Text style={styles.cardTitle}>Rates</Text>
        </View>
        <InfoRow icon="cash-outline" label="Hourly Rate" value={profile?.hourlyRate ? `R ${profile.hourlyRate}` : 'Not set'} styles={styles} c={c} />
        <InfoRow icon="car-outline" label="Call-out Fee" value={profile?.callOutFee ? `R ${profile.callOutFee}` : 'Not set'} styles={styles} c={c} />
        <InfoRow icon="navigate-outline" label="Service Radius" value={profile?.serviceRadiusKm ? `${profile.serviceRadiusKm} km` : 'Not set'} styles={styles} c={c} />
      </View>

      <View style={[styles.earningsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet-outline" size={20} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Earnings Overview</Text>
        </View>
        <View style={styles.earningsContainer}>
          <View style={styles.mainEarning}>
            <Text style={[styles.mainEarningValue, { color: '#22c55e' }]}>R {earnings.total.toFixed(0)}</Text>
            <Text style={[styles.mainEarningLabel, { color: c.textMuted }]}>Total Earnings</Text>
          </View>
          <View style={styles.earningsDetails}>
            <View style={styles.earningItem}>
              <View style={[styles.earningIcon, { backgroundColor: '#22c55e' + '20' }]}>
                <Ionicons name="trending-up" size={16} color="#22c55e" />
              </View>
              <View>
                <Text style={[styles.earningValue, { color: c.text }]}>R {earnings.thisMonth.toFixed(0)}</Text>
                <Text style={[styles.earningLabel, { color: c.textMuted }]}>This Month</Text>
              </View>
            </View>
            <View style={styles.earningItem}>
              <View style={[styles.earningIcon, { backgroundColor: '#3b82f6' + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
              </View>
              <View>
                <Text style={[styles.earningValue, { color: c.text }]}>{earnings.jobsCompleted}</Text>
                <Text style={[styles.earningLabel, { color: c.textMuted }]}>Jobs Done</Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.viewAllBtn, { backgroundColor: c.primary + '10', borderColor: c.primary }]}
          onPress={() => navigation.navigate('SPJobHistory')}
        >
          <Text style={[styles.viewAllBtnText, { color: c.primary }]}>View Detailed Earnings</Text>
          <Ionicons name="arrow-forward" size={16} color={c.primary} />
        </TouchableOpacity>
      </View>

      {profile && (
        <View style={styles.actionSection}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => navigation.navigate('SPBookings')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="calendar" size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.quickActionTitle, { color: c.text }]}>Bookings</Text>
              <Text style={[styles.quickActionCount, { color: '#3b82f6' }]}>{bookingStats.total}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => navigation.navigate('SPScheduleManager')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#8b5cf620' }]}>
                <Ionicons name="time" size={24} color="#8b5cf6" />
              </View>
              <Text style={[styles.quickActionTitle, { color: c.text }]}>Schedule</Text>
              <Text style={[styles.quickActionCount, { color: '#8b5cf6' }]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => navigation.navigate('SPJobHistory')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#10b98120' }]}>
                <Ionicons name="checkmark-done" size={24} color="#10b981" />
              </View>
              <Text style={[styles.quickActionTitle, { color: c.text }]}>Completed</Text>
              <Text style={[styles.quickActionCount, { color: '#10b981' }]}>{earnings.jobsCompleted}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => navigation.navigate('ServiceProviderEdit', { profile })}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: c.primary + '20' }]}>
                <Ionicons name="settings" size={24} color={c.primary} />
              </View>
              <Text style={[styles.quickActionTitle, { color: c.text }]}>Settings</Text>
              <Text style={[styles.quickActionCount, { color: c.primary }]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function countCsv(value) {
  if (!value) return '0';
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean).length.toString();
}

function StatCard({ icon, color, label, value, styles }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, styles, c }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={15} color={c.textMuted} style={{ width: 22 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(c) {
  const { width } = Dimensions.get('window');
  
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: 30 },
    center: { justifyContent: 'center', alignItems: 'center' },
    muted: { marginTop: 12, fontSize: 13, color: c.textMuted },

    // Hero Section
    heroSection: { borderRadius: 24, margin: 16, marginBottom: 20, overflow: 'hidden' },
    heroContent: { padding: 24 },
    profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
    statusIndicator: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
    profileInfo: { flex: 1 },
    businessName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
    email: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    reviewCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    quickActions: { flexDirection: 'row', gap: 12 },
    quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    quickActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Section Headers
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, marginLeft: 16 },

    // Stats Section
    statsSection: { marginBottom: 24 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
    statCard: { width: (width - 44) / 2, padding: 16, borderRadius: 16, borderWidth: 1 },
    statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statValue: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
    statLabel: { fontSize: 12, fontWeight: '500' },

    // Cards
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    rowLabel: { flex: 1, fontSize: 13, color: c.textMuted },
    rowValue: { flex: 1.2, textAlign: 'right', fontSize: 13, fontWeight: '600', color: c.text },

    // Earnings Card
    earningsCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, padding: 20 },
    earningsContainer: { marginBottom: 16 },
    mainEarning: { alignItems: 'center', marginBottom: 20 },
    mainEarningValue: { fontSize: 32, fontWeight: '900' },
    mainEarningLabel: { fontSize: 14, fontWeight: '500', marginTop: 4 },
    earningsDetails: { gap: 12 },
    earningItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    earningIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    earningValue: { fontSize: 16, fontWeight: '700' },
    earningLabel: { fontSize: 12, fontWeight: '500' },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    viewAllBtnText: { fontSize: 14, fontWeight: '600' },

    // Booking Stats
    bookingStatsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    bookingStatItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    bookingStatIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    bookingStatContent: { flex: 1 },
    bookingStatValue: { fontSize: 20, fontWeight: '800' },
    bookingStatLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    bookingStatDivider: { width: 1, height: 40, backgroundColor: c.border, marginHorizontal: 16 },

    // Action Section
    actionSection: { marginBottom: 20 },
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
    quickActionCard: { width: (width - 44) / 2, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    quickActionIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    quickActionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    quickActionCount: { fontSize: 16, fontWeight: '800' },

    // Empty State
    emptyCard: { alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingVertical: 32, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12 },
    emptySub: { fontSize: 13, color: c.textMuted, marginTop: 4, textAlign: 'center' },

    // Buttons
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, marginHorizontal: 16, marginBottom: 20, gap: 8 },
    editBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 16, marginHorizontal: 16, marginBottom: 20, gap: 8 },
    logoutTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
