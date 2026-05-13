import React from 'react';
import { View, StyleSheet } from 'react-native';
import StatCard from './StatCard';

export default function StatGrid({ stats, c }) {
  return (
    <View style={styles.grid}>
      {stats.map((stat, index) => (
        <View key={stat.label || index} style={styles.cardWrapper}>
          <StatCard
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            color={stat.color}
            subtext={stat.subtext}
            trend={stat.trend}
            trendUp={stat.trendUp}
            c={c}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
});
