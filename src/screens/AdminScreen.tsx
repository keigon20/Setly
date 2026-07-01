import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getCountFromServer,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../utils/firebase';
import { colors } from '../theme';

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  contentType: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: Date;
}

interface BugReport {
  id: string;
  userId: string;
  description: string;
  platform: string;
  platformVersion: string;
  appVariant: string;
  status: string;
  createdAt: Date;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserCount = async () => {
    try {
      const snap = await getCountFromServer(collection(db, 'users'));
      setUserCount(snap.data().count);
    } catch (err) {
      console.warn('[Admin] Failed to fetch user count:', err);
    }
  };

  useEffect(() => {
    fetchUserCount();

    const reportsUnsub = onSnapshot(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
      snap => {
        setReports(snap.docs.map(d => ({
          id: d.id,
          reporterId: d.data().reporterId,
          reportedUserId: d.data().reportedUserId,
          contentType: d.data().contentType,
          reason: d.data().reason,
          details: d.data().details,
          status: d.data().status,
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })));
        setLoading(false);
      },
      err => console.warn('[Admin] Reports listener error:', err.code),
    );

    const bugsUnsub = onSnapshot(
      query(collection(db, 'bugReports'), orderBy('createdAt', 'desc')),
      snap => {
        setBugReports(snap.docs.map(d => ({
          id: d.id,
          userId: d.data().userId,
          description: d.data().description,
          platform: d.data().platform,
          platformVersion: d.data().platformVersion,
          appVariant: d.data().appVariant,
          status: d.data().status,
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })));
      },
      err => console.warn('[Admin] Bug reports listener error:', err.code),
    );

    return () => {
      reportsUnsub();
      bugsUnsub();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserCount();
    setRefreshing(false);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={{ paddingTop: insets.top + 16 }}>
        <Text style={styles.screenTitle}>Admin</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={styles.statValue}>{userCount ?? '—'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Reports</Text>
          <Text style={styles.statValue}>{reports.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Bug Reports</Text>
          <Text style={styles.statValue}>{bugReports.length}</Text>
        </View>
      </View>

      {/* Content Reports */}
      <Text style={styles.sectionTitle}>Content Reports</Text>
      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports</Text>
      ) : (
        reports.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTag}>{r.contentType}</Text>
              <Text style={[styles.cardStatus, r.status === 'pending' && styles.statusPending]}>
                {r.status}
              </Text>
            </View>
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>Reason: </Text>
              <Text style={styles.cardFieldValue}>{r.reason}</Text>
            </Text>
            {r.details ? (
              <Text style={styles.cardRow}>
                <Text style={styles.cardFieldLabel}>Details: </Text>
                <Text style={styles.cardFieldValue}>{r.details}</Text>
              </Text>
            ) : null}
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>Reporter: </Text>
              <Text style={styles.cardFieldValueMono}>{r.reporterId}</Text>
            </Text>
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>Reported: </Text>
              <Text style={styles.cardFieldValueMono}>{r.reportedUserId}</Text>
            </Text>
            <Text style={styles.cardDate}>{formatDate(r.createdAt)}</Text>
          </View>
        ))
      )}

      {/* Bug Reports */}
      <Text style={styles.sectionTitle}>Bug Reports</Text>
      {bugReports.length === 0 ? (
        <Text style={styles.emptyText}>No bug reports</Text>
      ) : (
        bugReports.map(b => (
          <View key={b.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTag}>{b.platform} {b.platformVersion}</Text>
              <Text style={[styles.cardStatus, b.status === 'open' && styles.statusPending]}>
                {b.status}
              </Text>
            </View>
            <Text style={styles.cardDescription}>{b.description}</Text>
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>User: </Text>
              <Text style={styles.cardFieldValueMono}>{b.userId}</Text>
            </Text>
            {b.appVariant && (
              <Text style={styles.cardRow}>
                <Text style={styles.cardFieldLabel}>Variant: </Text>
                <Text style={styles.cardFieldValue}>{b.appVariant}</Text>
              </Text>
            )}
            <Text style={styles.cardDate}>{formatDate(b.createdAt)}</Text>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'capitalize',
  },
  cardStatus: {
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  statusPending: {
    color: '#F5A623',
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 20,
  },
  cardRow: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  cardFieldLabel: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  cardFieldValue: {
    color: colors.textSecondary,
  },
  cardFieldValueMono: {
    color: colors.textTertiary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  cardDate: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 6,
  },
});
