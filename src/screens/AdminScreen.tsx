import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  deleteField,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { writeNotification } from '../utils/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import RemoveContentModal from '../components/RemoveContentModal';
import SuspendUserModal from '../components/SuspendUserModal';
import { db } from '../utils/firebase';
import { MusicEvent, serializeEvent } from '../types';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  contentType: string;
  eventId?: string;
  commentId?: string;
  replyId?: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: Date;
}

export interface SuspendedUser {
  userId: string;
  email: string;
  displayName: string;
  suspendedUntil: Date;
}

export interface BugReport {
  id: string;
  userId: string;
  description: string;
  platform: string;
  platformVersion: string;
  appVariant: string;
  status: string;
  createdAt: Date;
}

export async function fetchReportedEvent(eventId: string): Promise<MusicEvent | null> {
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: snap.id,
      title: d.title,
      artists: d.artists || [],
      venue: d.venue,
      date: d.date?.toDate() || new Date(),
      cost: d.cost || 0,
      notes: d.notes || '',
      imageUri: d.imageUri,
      overallRating: d.overallRating,
      soundRating: d.soundRating,
      crowdRating: d.crowdRating,
      setlistRating: d.setlistRating,
      isHidden: d.isHidden || false,
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    };
  } catch {
    return null;
  }
}

export async function performRemoveContent(r: Report, customMessage: string): Promise<void> {
  const note = customMessage ? `\n\nAdmin note: ${customMessage}` : '';
  if (r.eventId) {
    await updateDoc(doc(db, 'events', r.eventId), { isHidden: true });
  }
  await updateDoc(doc(db, 'reports', r.id), { status: 'resolved' });
  await Promise.all([
    writeNotification(r.reporterId, {
      type: 'report_outcome',
      fromUserId: 'system',
      fromDisplayName: 'Setly',
      message: `Thank you for reporting inappropriate content. The content has been removed. Thank you for keeping Setly safe.${note}`,
    }),
    writeNotification(r.reportedUserId, {
      type: 'report_outcome',
      fromUserId: 'system',
      fromDisplayName: 'Setly',
      message: `Your post was ruled to be inappropriate and has been marked as private until edited. Repeat offenders may have their account suspended or banned. To appeal this decision please email setlyhelp@outlook.com.${note}`,
    }),
  ]);
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const navigating = useRef(false);
  const [removeTarget, setRemoveTarget] = useState<Report | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pendingReports = useMemo(() => reports.filter(r => r.status === 'pending'), [reports]);
  const pastReports = useMemo(() => reports.filter(r => r.status !== 'pending'), [reports]);

  // Count of resolved reports per reportedUserId (dismissed don't count)
  const resolvedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      if (r.status === 'resolved') {
        counts[r.reportedUserId] = (counts[r.reportedUserId] || 0) + 1;
      }
    });
    return counts;
  }, [reports]);

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

  const handleEndSuspension = (userId: string, label: string) => {
    Alert.alert(
      'End Suspension',
      `End the suspension for ${label}? They will be able to sign in again immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Suspension',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), { suspendedUntil: deleteField() });
            } catch {
              Alert.alert('Error', 'Failed to end suspension. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleRemoveConfirm = async (customMessage: string) => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    try {
      await performRemoveContent(target, customMessage);
    } catch {
      Alert.alert('Error', 'Failed to process decision. Please try again.');
    }
  };

  const handleIgnore = (r: Report) => {
    Alert.alert(
      'Dismiss Report',
      'Mark this report as dismissed with no action taken?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'reports', r.id), { status: 'dismissed' });
            } catch {
              Alert.alert('Error', 'Failed to dismiss report. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleReportPress = async (r: Report) => {
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
        Alert.alert('Not found', 'The flagged event could not be loaded (it may have been deleted).');
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

    const suspendedUsersUnsub = onSnapshot(
      query(collection(db, 'users'), where('suspendedUntil', '>', Timestamp.fromDate(new Date()))),
      snap => setSuspendedUsers(snap.docs.map(d => ({
        userId: d.id,
        email: d.data().email ?? '',
        displayName: d.data().displayName ?? '',
        suspendedUntil: d.data().suspendedUntil.toDate(),
      }))),
      err => console.warn('[Admin] suspendedUsers listener error:', err.code),
    );

    return () => { reportsUnsub(); bugsUnsub(); suspendedUsersUnsub(); };
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
    <View style={styles.container}>
    <ScrollView
      style={styles.flex}
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
          <Text style={styles.statLabel}>Active Reports</Text>
          <Text style={[styles.statValue, pendingReports.length > 0 && styles.statValueAlert]}>
            {pendingReports.length}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Bug Reports</Text>
          <Text style={styles.statValue}>{bugReports.length}</Text>
        </View>
      </View>

      {/* Active Content Reports */}
      <Text style={styles.sectionTitle}>Active Reports</Text>
      {pendingReports.length === 0 ? (
        <Text style={styles.emptyText}>No pending reports</Text>
      ) : (
        pendingReports.map(r => (
          <TouchableOpacity key={r.id} style={styles.card} onPress={() => handleReportPress(r)} activeOpacity={0.75}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTag}>{r.contentType}</Text>
              <View style={styles.cardHeaderRight}>
                <Text style={styles.statusPending}>pending</Text>
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
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnRemove]}
                onPress={e => { e.stopPropagation?.(); setRemoveTarget(r); }}
              >
                <Text style={styles.actionBtnRemoveText}>Remove Content</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnIgnore]}
                onPress={e => { e.stopPropagation?.(); handleIgnore(r); }}
              >
                <Text style={styles.actionBtnIgnoreText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuspend, { marginTop: 6 }]}
              onPress={e => { e.stopPropagation?.(); setSuspendTarget(r.reportedUserId); }}
            >
              <Text style={styles.actionBtnSuspendText}>Suspend User</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      {/* Past Reports link */}
      <TouchableOpacity style={styles.pastReportsRow} onPress={() => navigation.navigate('PastReports')}>
        <Text style={styles.pastReportsLabel}>Past Reports</Text>
        <View style={styles.pastReportsRight}>
          {pastReports.length > 0 && (
            <Text style={styles.pastReportsCount}>{pastReports.length}</Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      {/* Bug Reports */}
      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Bug Reports</Text>
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

      {/* Suspended Accounts */}
      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Suspended Accounts</Text>
      {suspendedUsers.length === 0 ? (
        <Text style={styles.emptyText}>No active suspensions</Text>
      ) : (
        suspendedUsers.map(u => {
          const daysLeft = Math.ceil((u.suspendedUntil.getTime() - Date.now()) / 86400000);
          return (
            <View key={u.userId} style={styles.suspendedUserRow}>
              <View style={styles.suspendedUserInfo}>
                <Text style={styles.suspendedUserName} numberOfLines={1}>
                  {u.displayName || u.email || u.userId}
                </Text>
                <Text style={styles.suspendedUserMeta}>
                  {u.email ? `${u.email} · ` : ''}{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                </Text>
              </View>
              <TouchableOpacity
                style={styles.endSuspensionBtn}
                onPress={() => handleEndSuspension(u.userId, u.displayName || u.email || u.userId)}
              >
                <Text style={styles.endSuspensionText}>End</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Banned Emails */}
      <TouchableOpacity style={styles.pastReportsRow} onPress={() => navigation.navigate('BannedEmails')}>
        <Text style={styles.pastReportsLabel}>Banned Emails</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>

    <RemoveContentModal
      visible={removeTarget !== null}
      onCancel={() => setRemoveTarget(null)}
      onConfirm={handleRemoveConfirm}
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
  flex: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: colors.textTertiary, marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  statValueAlert: { color: colors.destructive },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: { fontSize: 14, color: colors.textTertiary, marginBottom: 16 },
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
  statusPending: { fontSize: 11, color: '#F5A623', textTransform: 'capitalize' },
  cardDescription: { fontSize: 14, color: colors.textPrimary, marginBottom: 8, lineHeight: 20 },
  cardRow: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  cardFieldLabel: { color: colors.textTertiary, fontSize: 12 },
  cardFieldValue: { color: colors.textSecondary },
  cardFieldValueMono: { color: colors.textTertiary, fontSize: 11, fontFamily: 'monospace' },
  cardDate: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  priorRemovals: { fontSize: 12, color: colors.destructive, marginTop: 4, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnRemove: {
    backgroundColor: `${colors.destructive}22`,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  actionBtnRemoveText: { fontSize: 13, fontWeight: '600', color: colors.destructive },
  actionBtnIgnore: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  actionBtnIgnoreText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  actionBtnSuspend: { backgroundColor: '#F5A62318', borderWidth: 1, borderColor: '#F5A623' },
  actionBtnSuspendText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  suspendedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  suspendedUserInfo: { flex: 1, marginRight: 10 },
  suspendedUserName: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  suspendedUserMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  endSuspensionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}50`,
  },
  endSuspensionText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  pastReportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  pastReportsLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  pastReportsRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pastReportsCount: { fontSize: 13, color: colors.textTertiary },
});
