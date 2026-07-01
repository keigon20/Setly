import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { writeNotification } from '../utils/notifications';
import { colors } from '../theme';
import RemoveContentModal from '../components/RemoveContentModal';
import SuspendUserModal from '../components/SuspendUserModal';
import { serializeEvent } from '../types';
import { Report, fetchReportedEvent, performRemoveContent } from './AdminScreen';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PastReportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const navigating = useRef(false);
  const [removeTarget, setRemoveTarget] = useState<Report | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const resolvedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      if (r.status === 'resolved') {
        counts[r.reportedUserId] = (counts[r.reportedUserId] || 0) + 1;
      }
    });
    return counts;
  }, [reports]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, 'reports'),
        where('status', 'in', ['resolved', 'dismissed']),
        orderBy('createdAt', 'desc'),
      ),
      snap => {
        setReports(snap.docs.map(d => ({
          id: d.id,
          reporterId: d.data().reporterId,
          reportedUserId: d.data().reportedUserId,
          contentType: d.data().contentType,
          eventId: d.data().eventId,
          commentId: d.data().commentId,
          replyId: d.data().replyId,
          reason: d.data().reason,
          details: d.data().details,
          status: d.data().status,
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })));
        setLoading(false);
      },
      err => { console.warn('[PastReports] listener error:', err.code); setLoading(false); },
    );
    return () => unsub();
  }, []);

  const handleSuspendConfirm = async (days: number) => {
    if (!suspendTarget) return;
    const userId = suspendTarget;
    setSuspendTarget(null);
    if (userId === user?.id) {
      Alert.alert('Not allowed', 'You cannot suspend your own account.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        suspendedUntil: Timestamp.fromDate(new Date(Date.now() + days * 86400000)),
      });
      await writeNotification(userId, {
        type: 'report_outcome',
        fromUserId: 'system',
        fromDisplayName: 'Setly',
        message: `Your account has been suspended for ${days} day${days !== 1 ? 's' : ''}. You will not be able to access Setly during this time. Contact setlyhelp@outlook.com to appeal.`,
      });
    } catch {
      Alert.alert('Error', 'Failed to suspend user. Please try again.');
    }
  };

  const handlePress = async (r: Report) => {
    if (navigating.current) return;
    navigating.current = true;
    try {
      if (r.contentType === 'user') {
        Alert.alert('Reported User', `User ID: ${r.reportedUserId}`);
        return;
      }
      if (!r.eventId) {
        Alert.alert('Missing data', 'This report has no associated event ID.');
        return;
      }
      const event = await fetchReportedEvent(r.eventId);
      if (!event) {
        Alert.alert('Not found', 'The event could not be loaded (it may have been deleted).');
        return;
      }
      if (r.contentType === 'event') {
        navigation.navigate('EventDetail', { event: serializeEvent(event) });
      } else {
        navigation.navigate('Comments', {
          eventId: event.id,
          eventTitle: event.title,
          eventOwnerId: r.reportedUserId,
        });
      }
    } finally {
      navigating.current = false;
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>No past reports</Text>
          ) : (
            reports.map(r => (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                onPress={() => handlePress(r)}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTag}>{r.contentType}</Text>
                  <View style={styles.cardHeaderRight}>
                    <Text style={[
                      styles.cardStatus,
                      r.status === 'resolved' && styles.statusResolved,
                      r.status === 'dismissed' && styles.statusDismissed,
                    ]}>
                      {r.status}
                    </Text>
                    <Text style={styles.cardChevron}>›</Text>
                  </View>
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
                {(resolvedCounts[r.reportedUserId] ?? 0) > 0 && (
                  <Text style={styles.priorRemovals}>
                    {resolvedCounts[r.reportedUserId]} prior content removal{resolvedCounts[r.reportedUserId] > 1 ? 's' : ''}
                  </Text>
                )}
                <Text style={styles.cardDate}>{formatDate(r.createdAt)}</Text>

                {r.status === 'dismissed' && (
                  <TouchableOpacity
                    style={styles.overrideBtn}
                    onPress={e => { e.stopPropagation?.(); setRemoveTarget(r); }}
                  >
                    <Text style={styles.overrideBtnText}>Remove Content</Text>
                  </TouchableOpacity>
                )}

                {r.status === 'resolved' && (
                  <View style={styles.resolvedBadge}>
                    <Text style={styles.resolvedBadgeText}>Content Removed</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.suspendBtn}
                  onPress={e => { e.stopPropagation?.(); setSuspendTarget(r.reportedUserId); }}
                >
                  <Text style={styles.suspendBtnText}>Suspend User</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <RemoveContentModal
        visible={removeTarget !== null}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async (customMessage) => {
          if (!removeTarget) return;
          const target = removeTarget;
          setRemoveTarget(null);
          try {
            await performRemoveContent(target, customMessage);
          } catch {
            Alert.alert('Error', 'Failed to process decision. Please try again.');
          }
        }}
      />
      <SuspendUserModal
        visible={suspendTarget !== null}
        userId={suspendTarget ?? ''}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={handleSuspendConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { fontSize: 16, color: colors.textSecondary, width: 50 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 50 },
  scrollContent: { padding: 16 },
  emptyText: { fontSize: 14, color: colors.textTertiary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardChevron: { fontSize: 18, color: colors.textTertiary, lineHeight: 20 },
  cardTag: { fontSize: 12, fontWeight: '600', color: colors.accent, textTransform: 'capitalize' },
  cardStatus: { fontSize: 11, color: colors.textTertiary, textTransform: 'capitalize' },
  statusResolved: { color: colors.accent },
  statusDismissed: { color: colors.textTertiary },
  cardRow: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  cardFieldLabel: { color: colors.textTertiary, fontSize: 12 },
  cardFieldValue: { color: colors.textSecondary },
  cardFieldValueMono: { color: colors.textTertiary, fontSize: 11, fontFamily: 'monospace' },
  cardDate: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  priorRemovals: { fontSize: 12, color: colors.destructive, marginTop: 4, fontWeight: '600' },
  overrideBtn: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: `${colors.destructive}22`,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  overrideBtnText: { fontSize: 13, fontWeight: '600', color: colors.destructive },
  resolvedBadge: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
  },
  resolvedBadgeText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  suspendBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5A62318',
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  suspendBtnText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
});
