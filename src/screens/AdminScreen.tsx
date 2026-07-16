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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  getCountFromServer,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  deleteField,
  Timestamp,
  serverTimestamp,
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
import { MusicEvent, serializeEvent, Giveaway } from '../types';
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
      cost: d.cost ?? null,
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

const EMPTY_GIVEAWAY_FORM = {
  eventTitle: '',
  date: '',
  location: '',
  ticketType: '',
  deadline: '',
  terms: '',
};

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

  // Giveaway state
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [showCreateGiveaway, setShowCreateGiveaway] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [giveawayForm, setGiveawayForm] = useState(EMPTY_GIVEAWAY_FORM);
  const [savingGiveaway, setSavingGiveaway] = useState(false);

  // Send notification state
  const [showSendNotif, setShowSendNotif] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifRecipient, setNotifRecipient] = useState<{ id: string; displayName: string } | null>(null);
  const [lookingUpUser, setLookingUpUser] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);

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

  const handleCreateGiveaway = async () => {
    const { eventTitle, date, location, ticketType, deadline, terms } = giveawayForm;
    if (!eventTitle.trim() || !date.trim() || !location.trim() || !ticketType.trim() || !deadline.trim() || !terms.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields before saving.');
      return;
    }
    const parsedDate = new Date(date);
    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDate.getTime()) || isNaN(parsedDeadline.getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for dates.');
      return;
    }
    setSavingGiveaway(true);
    try {
      await addDoc(collection(db, 'giveaways'), {
        eventTitle: eventTitle.trim(),
        date: Timestamp.fromDate(parsedDate),
        location: location.trim(),
        ticketType: ticketType.trim(),
        deadline: Timestamp.fromDate(parsedDeadline),
        terms: terms.trim(),
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user?.id ?? '',
      });
      setGiveawayForm(EMPTY_GIVEAWAY_FORM);
      setShowCreateGiveaway(false);
    } catch {
      Alert.alert('Error', 'Failed to create giveaway. Please try again.');
    } finally {
      setSavingGiveaway(false);
    }
  };

  const handleOpenEdit = (g: Giveaway) => {
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    setGiveawayForm({
      eventTitle: g.eventTitle,
      date: toDateStr(g.date),
      location: g.location,
      ticketType: g.ticketType,
      deadline: toDateStr(g.deadline),
      terms: g.terms,
    });
    setEditingGiveaway(g);
  };

  const handleSaveEditGiveaway = async () => {
    if (!editingGiveaway) return;
    const { eventTitle, date, location, ticketType, deadline, terms } = giveawayForm;
    if (!eventTitle.trim() || !date.trim() || !location.trim() || !ticketType.trim() || !deadline.trim() || !terms.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields before saving.');
      return;
    }
    const parsedDate = new Date(date);
    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDate.getTime()) || isNaN(parsedDeadline.getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for dates.');
      return;
    }
    setSavingGiveaway(true);
    try {
      await updateDoc(doc(db, 'giveaways', editingGiveaway.id), {
        eventTitle: eventTitle.trim(),
        date: Timestamp.fromDate(parsedDate),
        location: location.trim(),
        ticketType: ticketType.trim(),
        deadline: Timestamp.fromDate(parsedDeadline),
        terms: terms.trim(),
      });
      setEditingGiveaway(null);
      setGiveawayForm(EMPTY_GIVEAWAY_FORM);
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSavingGiveaway(false);
    }
  };

  const handleToggleGiveaway = (g: Giveaway) => {
    const action = g.active ? 'deactivate' : 'reactivate';
    Alert.alert(
      g.active ? 'Deactivate Giveaway' : 'Reactivate Giveaway',
      `${g.active ? 'Hide' : 'Show'} "${g.eventTitle}" from the Giveaways tab?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'giveaways', g.id), { active: !g.active });
            } catch {
              Alert.alert('Error', `Failed to ${action} giveaway.`);
            }
          },
        },
      ],
    );
  };

  const handleDeleteGiveaway = (g: Giveaway) => {
    Alert.alert(
      'Delete Giveaway',
      `Permanently delete "${g.eventTitle}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'giveaways', g.id));
            } catch {
              Alert.alert('Error', 'Failed to delete giveaway.');
            }
          },
        },
      ],
    );
  };

  const handleLookupUser = async () => {
    const normalized = notifEmail.trim().toLowerCase();
    if (!normalized) return;
    setLookingUpUser(true);
    setNotifRecipient(null);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', normalized)));
      if (snap.empty) {
        Alert.alert('Not found', 'No user found with that email address.');
      } else {
        const d = snap.docs[0];
        setNotifRecipient({ id: d.id, displayName: d.data().displayName || normalized });
      }
    } catch {
      Alert.alert('Error', 'Failed to look up user. Please try again.');
    } finally {
      setLookingUpUser(false);
    }
  };

  const handleSendCustomNotif = async () => {
    if (!notifRecipient || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      await writeNotification(notifRecipient.id, {
        type: 'report_outcome',
        fromUserId: 'system',
        fromDisplayName: 'Setly',
        message: notifMessage.trim(),
      });
      Alert.alert('Sent', `Notification delivered to ${notifRecipient.displayName}.`);
      setShowSendNotif(false);
      setNotifEmail('');
      setNotifMessage('');
      setNotifRecipient(null);
    } catch {
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setSendingNotif(false);
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
      err => { console.warn('[Admin] Reports listener error:', err.code); setLoading(false); },
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

    const giveawaysUnsub = onSnapshot(
      query(collection(db, 'giveaways'), orderBy('createdAt', 'desc')),
      snap => setGiveaways(snap.docs.map(d => ({
        id: d.id,
        eventTitle: d.data().eventTitle,
        date: d.data().date?.toDate() || new Date(),
        location: d.data().location,
        ticketType: d.data().ticketType,
        deadline: d.data().deadline?.toDate() || new Date(),
        terms: d.data().terms,
        active: d.data().active,
        createdAt: d.data().createdAt?.toDate() || new Date(),
        createdBy: d.data().createdBy ?? '',
      }))),
      err => console.warn('[Admin] Giveaways listener error:', err.code),
    );

    return () => { reportsUnsub(); bugsUnsub(); suspendedUsersUnsub(); giveawaysUnsub(); };
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

      {/* Send Notification */}
      <TouchableOpacity style={styles.sendNotifRow} onPress={() => setShowSendNotif(true)}>
        <Ionicons name="notifications-outline" size={18} color={colors.accent} />
        <Text style={styles.sendNotifRowText}>Send Notification to User</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

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

      {/* Giveaways */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Giveaways</Text>
        <TouchableOpacity
          style={styles.createGiveawayBtn}
          onPress={() => setShowCreateGiveaway(true)}
        >
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={styles.createGiveawayBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {giveaways.length === 0 ? (
        <Text style={[styles.emptyText, { marginTop: 8 }]}>No giveaways yet</Text>
      ) : (
        giveaways.map(g => (
          <TouchableOpacity
            key={g.id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('GiveawayEntries', { giveawayId: g.id, giveawayTitle: g.eventTitle })}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTag, !g.active && { color: colors.textTertiary }]}>
                {g.active ? 'active' : 'inactive'}
              </Text>
              <Text style={styles.cardDate}>{formatDate(g.deadline)} deadline</Text>
            </View>
            <Text style={styles.giveawayTitle}>{g.eventTitle}</Text>
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>Location: </Text>
              <Text style={styles.cardFieldValue}>{g.location}</Text>
            </Text>
            <Text style={styles.cardRow}>
              <Text style={styles.cardFieldLabel}>Ticket: </Text>
              <Text style={styles.cardFieldValue}>{g.ticketType}</Text>
            </Text>
            <View style={[styles.actionRow, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnIgnore]}
                onPress={e => { e.stopPropagation?.(); handleOpenEdit(g); }}
              >
                <Text style={styles.actionBtnIgnoreText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, g.active ? styles.actionBtnIgnore : styles.actionBtnAccent]}
                onPress={e => { e.stopPropagation?.(); handleToggleGiveaway(g); }}
              >
                <Text style={[styles.actionBtnIgnoreText, !g.active && { color: colors.accent }]}>
                  {g.active ? 'Deactivate' : 'Reactivate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnRemove]}
                onPress={e => { e.stopPropagation?.(); handleDeleteGiveaway(g); }}
              >
                <Text style={styles.actionBtnRemoveText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}

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

    {/* Send Notification modal */}
    <Modal
      visible={showSendNotif}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !sendingNotif && setShowSendNotif(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Send Notification</Text>
          <TouchableOpacity
            onPress={() => { setShowSendNotif(false); setNotifEmail(''); setNotifMessage(''); setNotifRecipient(null); }}
            hitSlop={8}
            disabled={sendingNotif}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.modalFormContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.inputLabel}>Recipient Email</Text>
          <View style={styles.emailRow}>
            <TextInput
              style={[styles.input, styles.emailInput]}
              placeholder="user@example.com"
              placeholderTextColor={colors.textTertiary}
              value={notifEmail}
              onChangeText={v => { setNotifEmail(v); setNotifRecipient(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.lookupBtn, lookingUpUser && styles.lookupBtnDisabled]}
              onPress={handleLookupUser}
              disabled={lookingUpUser || !notifEmail.trim()}
              activeOpacity={0.8}
            >
              {lookingUpUser
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.lookupBtnText}>Find</Text>
              }
            </TouchableOpacity>
          </View>

          {notifRecipient && (
            <View style={styles.recipientFound}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.recipientFoundText}>{notifRecipient.displayName}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Write your message…"
            placeholderTextColor={colors.textTertiary}
            value={notifMessage}
            onChangeText={setNotifMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.saveGiveawayBtn,
              (!notifRecipient || !notifMessage.trim() || sendingNotif) && styles.saveGiveawayBtnDisabled,
            ]}
            onPress={handleSendCustomNotif}
            disabled={!notifRecipient || !notifMessage.trim() || sendingNotif}
            activeOpacity={0.8}
          >
            {sendingNotif
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveGiveawayBtnText}>Send Notification</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

    {/* Create / Edit Giveaway modal */}
    <Modal
      visible={showCreateGiveaway || editingGiveaway !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (savingGiveaway) return;
        setShowCreateGiveaway(false);
        setEditingGiveaway(null);
        setGiveawayForm(EMPTY_GIVEAWAY_FORM);
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editingGiveaway ? 'Edit Giveaway' : 'Create Giveaway'}</Text>
          <TouchableOpacity
            onPress={() => { setShowCreateGiveaway(false); setEditingGiveaway(null); setGiveawayForm(EMPTY_GIVEAWAY_FORM); }}
            hitSlop={8}
            disabled={savingGiveaway}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.modalFormContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.inputLabel}>Event Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Coachella 2025"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.eventTitle}
            onChangeText={v => setGiveawayForm(f => ({ ...f, eventTitle: v }))}
          />

          <Text style={styles.inputLabel}>Event Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.date}
            onChangeText={v => setGiveawayForm(f => ({ ...f, date: v }))}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Indio, CA"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.location}
            onChangeText={v => setGiveawayForm(f => ({ ...f, location: v }))}
          />

          <Text style={styles.inputLabel}>Ticket Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2-Day GA, VIP, Weekend Pass"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.ticketType}
            onChangeText={v => setGiveawayForm(f => ({ ...f, ticketType: v }))}
          />

          <Text style={styles.inputLabel}>Entry Deadline</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.deadline}
            onChangeText={v => setGiveawayForm(f => ({ ...f, deadline: v }))}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.inputLabel}>Terms &amp; Conditions</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Enter the full terms and conditions users must accept to enter…"
            placeholderTextColor={colors.textTertiary}
            value={giveawayForm.terms}
            onChangeText={v => setGiveawayForm(f => ({ ...f, terms: v }))}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveGiveawayBtn, savingGiveaway && styles.saveGiveawayBtnDisabled]}
            onPress={editingGiveaway ? handleSaveEditGiveaway : handleCreateGiveaway}
            disabled={savingGiveaway}
            activeOpacity={0.8}
          >
            {savingGiveaway ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveGiveawayBtnText}>{editingGiveaway ? 'Save Changes' : 'Create Giveaway'}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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

  // Send notification row
  sendNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  sendNotifRowText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary },

  // Email lookup row
  emailRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emailInput: { flex: 1 },
  lookupBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnDisabled: { opacity: 0.5 },
  lookupBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  recipientFound: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  recipientFoundText: { fontSize: 13, color: '#34C759', fontWeight: '500' },

  // Giveaway section
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  createGiveawayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}50`,
  },
  createGiveawayBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  giveawayTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  actionBtnAccent: {
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}50`,
  },

  // Create giveaway modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalFormContent: { padding: 16 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputMultiline: { minHeight: 140, paddingTop: 12 },
  saveGiveawayBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveGiveawayBtnDisabled: { opacity: 0.5 },
  saveGiveawayBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
