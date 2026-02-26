import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, Alert, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { getCurrentMonthRange, getVehicleWeeklyPerformance } from '../api/analytics';
import { useAppTheme } from '../theme';

export default function VehiclePerformanceScreen({ route, navigation }) {
  const { vehicle } = route.params || {};
  const { theme, mode } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const chartConfig = useMemo(() => {
    const textRgb = mode === 'dark' ? '229,231,235' : '15,23,42';
    return {
      backgroundGradientFrom: c.surface,
      backgroundGradientTo: c.surface,
      color: (opacity = 1) => `rgba(${textRgb}, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
    };
  }, [c.surface, mode]);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  const vehicleId = vehicle?.id || vehicle?.Id || vehicle?.vehicleId;

  const screenWidth = Dimensions.get('window').width - 32;
  const labels = useMemo(() => weeklyData.map(w => String(w.label || '')), [weeklyData]);
  const chartWidth = useMemo(() => {
    const count = labels.length;
    return Math.max(screenWidth, count * 80);
  }, [labels, screenWidth]);

  useEffect(() => {
    navigation.setOptions({ title: `${vehicle?.registration || 'Vehicle'} Weekly` });
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await getVehicleWeeklyPerformance(
          vehicleId,
          monthRange.startDate,
          monthRange.endDate
        );
        if (!mounted) return;
        setWeeklyData(data || []);
      } catch (err) {
        console.warn('Error loading weekly performance', err);
        Alert.alert('Error', 'Failed to load weekly performance');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (vehicleId) {
      load();
    } else {
      setWeeklyData([]);
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [vehicleId, vehicle]);

  function currency(value) {
    const num = Number(value) || 0;
    return `R${num.toFixed(2)}`;
  }

  if (loading) {
    return (
      <View style={styles.loading}><ActivityIndicator size="large"/></View>
    );
  }

  const earningsSeries = weeklyData.map(w => Number(w.earnings) || 0);
  const expensesSeries = weeklyData.map(w => Number(w.expenses) || 0);
  const profitSeries = weeklyData.map(w => Number(w.profit) || 0);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[weekly-screen] series totals', {
      earnings: earningsSeries.reduce((s, n) => s + n, 0),
      expenses: expensesSeries.reduce((s, n) => s + n, 0),
      profit: profitSeries.reduce((s, n) => s + n, 0),
    });
  }

  const earningsChartData = {
    labels,
    datasets: [{
      data: earningsSeries,
      colors: earningsSeries.map(() => () => c.success),
    }],
  };

  const expensesChartData = {
    labels,
    datasets: [{
      data: expensesSeries,
      colors: expensesSeries.map(() => () => c.danger),
    }],
  };

  const profitChartData = {
    labels,
    datasets: [{
      data: profitSeries,
      colors: profitSeries.map(() => () => c.textMuted),
    }],
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {weeklyData.length === 0 ? (
        <Text style={styles.empty}>No weekly data available for this period.</Text>
      ) : (
        <>
          {/* guard: ensure labels and datasets align */}
          {labels.length !== earningsChartData.datasets[0].data.length && (
            <Text style={styles.empty}>Chart data unavailable due to formatting issue.</Text>
          )}
          <Text style={styles.chartTitle}>Weekly Earnings</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <BarChart
              data={earningsChartData}
              width={chartWidth}
              height={220}
              yAxisLabel="R"
              chartConfig={{
                ...chartConfig,
                color: () => c.success,
                fillShadowGradient: c.success,
                fillShadowGradientOpacity: 1,
                decimalPlaces: 0,
                propsForLabels: { fontSize: 10 },
              }}
              withCustomBarColorFromData
              flatColor
              verticalLabelRotation={0}
              fromZero
              withInnerLines={false}
              showBarTops={false}
            />
          </ScrollView>
          <View style={{ height: 24 }} />

          <Text style={styles.chartTitle}>Weekly Expenses</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <BarChart
              data={expensesChartData}
              width={chartWidth}
              height={220}
              yAxisLabel="R"
              chartConfig={{
                ...chartConfig,
                color: () => c.danger,
                fillShadowGradient: c.danger,
                fillShadowGradientOpacity: 1,
                decimalPlaces: 0,
                propsForLabels: { fontSize: 10 },
              }}
              withCustomBarColorFromData
              flatColor
              verticalLabelRotation={0}
              fromZero
              withInnerLines={false}
              showBarTops={false}
            />
          </ScrollView>
          <View style={{ height: 24 }} />

          <Text style={styles.chartTitle}>Weekly Profit</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <BarChart
              data={profitChartData}
              width={chartWidth}
              height={220}
              yAxisLabel="R"
              chartConfig={{
                ...chartConfig,
                color: () => c.textMuted,
                fillShadowGradient: c.textMuted,
                fillShadowGradientOpacity: 1,
                decimalPlaces: 0,
                propsForLabels: { fontSize: 10 },
              }}
              withCustomBarColorFromData
              flatColor
              verticalLabelRotation={0}
              fromZero
              withInnerLines={false}
              showBarTops={false}
            />
          </ScrollView>

          <View style={{ height: 24 }} />
          <FlatList
            data={weeklyData}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.weekCard}
                onPress={() => {
                  const startISO = item?.start ? new Date(item.start).toISOString().split('T')[0] : null;
                  const endISO = item?.end ? new Date(item.end).toISOString().split('T')[0] : null;
                  navigation.navigate('VehicleWeekDetails', {
                    vehicleId,
                    registration: vehicle?.registration || vehicle?.Registration || '',
                    weekLabel: item?.label || 'Week',
                    startDate: startISO,
                    endDate: endISO,
                  });
                }}
              >
                <Text style={styles.weekLabel}>{item.label}</Text>
                <View style={styles.numbersRow}>
                  <Text style={styles.earnings}>+ {currency(item.earnings)}</Text>
                  <Text style={styles.expenses}>- {currency(item.expenses)}</Text>
                  <Text style={[styles.profit, { color: (item.profit || 0) >= 0 ? c.success : c.danger }]}>
                    {currency(item.profit)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    empty: { color: c.textMuted, textAlign: 'center', marginTop: 20 },
    chartTitle: { fontSize: 16, fontWeight: '900', marginBottom: 8, color: c.text },
    weekCard: { padding: 12, backgroundColor: c.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    weekLabel: { fontSize: 13, fontWeight: '900', color: c.text },
    numbersRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    earnings: { fontSize: 12, color: c.success, fontWeight: '800' },
    expenses: { fontSize: 12, color: c.danger, fontWeight: '800' },
    profit: { fontSize: 12, fontWeight: '900' },
  });
}
