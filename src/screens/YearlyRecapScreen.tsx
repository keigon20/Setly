import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useEventStore } from '../contexts/EventStoreContext';
import { MusicEvent } from '../types';
import { colors } from '../theme';

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function topRanked(items: string[], limit = 3): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  items.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function bestRated(events: MusicEvent[]): MusicEvent | undefined {
  const rated = events.filter(e => e.overallRating != null);
  if (rated.length === 0) return undefined;
  return rated.reduce((best, e) => (e.overallRating! > best.overallRating! ? e : best));
}

export default function YearlyRecapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { availableYears, statisticsForYear, eventsForYear } = useEventStore();

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

  const stats = useMemo(() => statisticsForYear(selectedYear), [selectedYear, statisticsForYear]);
  const yearEvents = useMemo(() => eventsForYear(selectedYear), [selectedYear, eventsForYear]);

  const topArtists = useMemo(
    () => topRanked(yearEvents.flatMap(e => e.artists)),
    [yearEvents],
  );
  const topVenues = useMemo(
    () => topRanked(yearEvents.map(e => e.venue)),
    [yearEvents],
  );
  const best = useMemo(() => bestRated(yearEvents), [yearEvents]);

  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    yearEvents.forEach(e => {
      const m = new Date(e.date).getMonth();
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [yearEvents]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxMonthCount = Math.max(...Object.values(monthCounts), 1);

  if (availableYears.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yearly Recap</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Add some events to see your recap</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yearly Recap</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Year tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsBar}
      >
        {availableYears.map(year => (
          <TouchableOpacity
            key={year}
            style={[styles.tab, selectedYear === year && styles.tabActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.tabText, selectedYear === year && styles.tabTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroYear}>{selectedYear}</Text>
          <Text style={styles.heroLabel}>
            You attended{' '}
            <Text style={styles.heroAccent}>{stats.totalEvents}</Text>
            {stats.totalEvents === 1 ? ' show' : ' shows'}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          {[
            ['Shows', `${stats.totalEvents}`],
            ['Unique Artists', `${stats.uniqueArtists}`],
            ['Unique Venues', `${stats.uniqueVenues}`],
            ['Total Spent', formatCurrency(stats.totalMoneySpent)],
            ['Avg Cost', formatCurrency(stats.averageCost)],
            ['Top Artist', stats.favoriteArtist || '—'],
          ].map(([label, value]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Top Artists */}
        {topArtists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Artists</Text>
            {topArtists.map((item, i) => (
              <View key={item.name} style={styles.rankRow}>
                <Text style={styles.rankNumber}>{i + 1}</Text>
                <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rankCount}>
                  {item.count} {item.count === 1 ? 'show' : 'shows'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Venues */}
        {topVenues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Venues</Text>
            {topVenues.map((item, i) => (
              <View key={item.name} style={styles.rankRow}>
                <Text style={styles.rankNumber}>{i + 1}</Text>
                <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rankCount}>
                  {item.count} {item.count === 1 ? 'show' : 'shows'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Best show */}
        {best && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Rated Show</Text>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{best.title}</Text>
              <Text style={styles.highlightSub}>
                {best.venue} · {new Date(best.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </Text>
              <Text style={styles.highlightRating}>{best.overallRating?.toFixed(1)} / 10</Text>
            </View>
          </View>
        )}

        {/* Month activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity by Month</Text>
          <View style={styles.monthGrid}>
            {MONTHS.map((m, i) => {
              const count = monthCounts[i] || 0;
              const filled = count > 0;
              const height = filled ? Math.max(8, Math.round((count / maxMonthCount) * 48)) : 4;
              return (
                <View key={m} style={styles.monthCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height, backgroundColor: filled ? colors.accent : colors.surfaceAlt },
                      ]}
                    />
                  </View>
                  {count > 0 && <Text style={styles.barCount}>{count}</Text>}
                  <Text style={styles.monthLabel}>{m}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* First & last show */}
        {(stats.oldestEvent || stats.mostRecentEvent) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {stats.oldestEvent && (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineTag}>First</Text>
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineTitle}>{stats.oldestEvent.title}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(stats.oldestEvent.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}
            {stats.mostRecentEvent && stats.mostRecentEvent.id !== stats.oldestEvent?.id && (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineTag}>Last</Text>
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineTitle}>{stats.mostRecentEvent.title}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(stats.mostRecentEvent.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
    width: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  tabsBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 56,
  },
  tabsContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 4,
  },
  heroYear: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroAccent: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  rankName: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rankCount: {
    fontSize: 13,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  highlightCard: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  highlightSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  highlightRating: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
  },
  monthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  monthCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 52,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  bar: {
    width: 14,
    borderRadius: 4,
  },
  barCount: {
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 1,
  },
  monthLabel: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    width: 40,
  },
  timelineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  bottomSpacer: {
    height: 32,
  },
});
