import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../utils/firebase';
import { writeNotification } from '../utils/notifications';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type RouteProps = RouteProp<RootStackParamList, 'GiveawayEntries'>;

interface Entry {
  userId: string;
  displayName: string;
  email: string;
  enteredAt: Date;
  isManual: boolean;
}

interface WinnerInfo {
  userId: string;
  displayName: string;
  email: string;
  notified: boolean;
  isManual: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GiveawayEntriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { giveawayId, giveawayTitle } = route.params;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedWinner, setSavedWinner] = useState<WinnerInfo | null>(null);
  const [pendingWinner, setPendingWinner] = useState<Entry | null>(null);
  const [savingWinner, setSavingWinner] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [giveawaySnap, entriesSnap] = await Promise.all([
          getDoc(doc(db, 'giveaways', giveawayId)),
          getDocs(collection(db, 'giveaways', giveawayId, 'entries')),
        ]);

        // Load saved winner
        if (giveawaySnap.exists()) {
          const d = giveawaySnap.data();
          if (d.winnerId) {
            setSavedWinner({
              userId: d.winnerId,
              displayName: d.winnerName ?? 'Unknown',
              email: d.winnerEmail ?? '',
              notified: d.winnerNotified ?? false,
              isManual: d.winnerIsManual ?? false,
            });
          }
        }

        // Load entries with user profiles. Manually-added (email) entries
        // carry their own name/email on the doc instead of a real uid to
        // join against, so skip the users/ lookup for those.
        const loaded: Entry[] = await Promise.all(
          entriesSnap.docs.map(async d => {
            const userId = d.id;
            const data = d.data();
            const enteredAt: Date = data.enteredAt?.toDate() || new Date();
            if (data.isManualEntry) {
              return {
                userId,
                displayName: data.manualDisplayName || 'Unknown',
                email: data.manualEmail || '',
                enteredAt,
                isManual: true,
              };
            }
            try {
              const userSnap = await getDoc(doc(db, 'users', userId));
              const userData = userSnap.data();
              return {
                userId,
                displayName: userData?.displayName || 'Unknown',
                email: userData?.email || '',
                enteredAt,
                isManual: false,
              };
            } catch {
              return { userId, displayName: 'Unknown', email: '', enteredAt, isManual: false };
            }
          }),
        );
        loaded.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());
        setEntries(loaded);
      } catch (err) {
        console.warn('[GiveawayEntries] load error:', err);
        Alert.alert('Error', 'Failed to load entries.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [giveawayId]);

  const handleChooseWinner = () => {
    if (entries.length === 0) {
      Alert.alert('No entries', 'There are no entries to choose from.');
      return;
    }
    const idx = Math.floor(Math.random() * entries.length);
    setPendingWinner(entries[idx]);
  };

  const handleAddManualEntry = async () => {
    const name = manualName.trim();
    const email = manualEmail.trim();
    if (!name) {
      Alert.alert('Missing name', 'Please enter a name for this entry.');
      return;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setAddingEntry(true);
    try {
      const entryId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(doc(db, 'giveaways', giveawayId, 'entries', entryId), {
        isManualEntry: true,
        manualDisplayName: name,
        manualEmail: email,
        enteredAt: serverTimestamp(),
      });
      const newEntry: Entry = { userId: entryId, displayName: name, email, enteredAt: new Date(), isManual: true };
      setEntries(prev => [...prev, newEntry].sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime()));
      setManualName('');
      setManualEmail('');
      setShowAddEntry(false);
    } catch {
      Alert.alert('Error', 'Failed to add entry. Please try again.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleConfirmWinner = async () => {
    if (!pendingWinner) return;
    setSavingWinner(true);
    try {
      await updateDoc(doc(db, 'giveaways', giveawayId), {
        winnerId: pendingWinner.userId,
        winnerName: pendingWinner.displayName,
        winnerEmail: pendingWinner.email,
        winnerNotified: false,
        winnerIsManual: pendingWinner.isManual,
      });
      setSavedWinner({
        userId: pendingWinner.userId,
        displayName: pendingWinner.displayName,
        email: pendingWinner.email,
        notified: false,
        isManual: pendingWinner.isManual,
      });
      setPendingWinner(null);
    } catch {
      Alert.alert('Error', 'Failed to save winner. Please try again.');
    } finally {
      setSavingWinner(false);
    }
  };

  const handleSendNotification = async () => {
    if (!savedWinner) return;
    setSendingNotif(true);
    try {
      await writeNotification(savedWinner.userId, {
        type: 'giveaway_winner',
        fromUserId: 'system',
        fromDisplayName: 'Setly',
        message: `Congratulations! You were selected as the winner for ${giveawayTitle}. Please check your inbox for an email from setlyhelp@outlook.com. Failure to send confirmation may result in forfeiture of your prize.`,
      });
      await updateDoc(doc(db, 'giveaways', giveawayId), { winnerNotified: true });
      setSavedWinner(prev => prev ? { ...prev, notified: true } : prev);
    } catch {
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setSendingNotif(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle} numberOfLines={1}>Entries</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{giveawayTitle}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddEntry(true)} hitSlop={8} style={styles.addEntryBtn}>
          <Ionicons name="add" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>

            {/* Saved winner card */}
            {savedWinner && (
              <View style={styles.winnerSection}>
                <Text style={styles.winnerSectionLabel}>Winner</Text>
                <View style={styles.winnerBanner}>
                  <Text style={styles.winnerBannerEmoji}>🏆</Text>
                  <View style={styles.winnerBannerInfo}>
                    <Text style={styles.winnerBannerName}>{savedWinner.displayName}</Text>
                    {savedWinner.email ? (
                      <Text style={styles.winnerBannerEmail}>{savedWinner.email}</Text>
                    ) : null}
                  </View>
                </View>
                {savedWinner.isManual ? (
                  <View style={styles.notifiedRow}>
                    <Ionicons name="mail-outline" size={15} color={colors.textTertiary} />
                    <Text style={styles.manualNoteText}>
                      Entered via email — notify them directly, there's no app account to send an in-app notification to.
                    </Text>
                  </View>
                ) : savedWinner.notified ? (
                  <View style={styles.notifiedRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#34C759" />
                    <Text style={styles.notifiedText}>Notification sent</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.sendNotifBtn, sendingNotif && styles.sendNotifBtnDisabled]}
                    onPress={handleSendNotification}
                    disabled={sendingNotif}
                    activeOpacity={0.8}
                  >
                    {sendingNotif ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="notifications" size={15} color="#fff" />
                        <Text style={styles.sendNotifBtnText}>Send Notification</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Entry count */}
            <Text style={styles.countLabel}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>

            {entries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No entries yet</Text>
              </View>
            ) : (
              entries.map((e, i) => (
                <View
                  key={e.userId}
                  style={[
                    styles.entryRow,
                    savedWinner?.userId === e.userId && styles.entryRowWinner,
                  ]}
                >
                  <View style={[
                    styles.entryIndex,
                    savedWinner?.userId === e.userId && styles.entryIndexWinner,
                  ]}>
                    {savedWinner?.userId === e.userId
                      ? <Text style={styles.entryIndexTrophy}>🏆</Text>
                      : <Text style={styles.entryIndexText}>{i + 1}</Text>
                    }
                  </View>
                  <View style={styles.entryInfo}>
                    <View style={styles.entryNameRow}>
                      <Text style={styles.entryName}>{e.displayName}</Text>
                      {e.isManual && (
                        <View style={styles.manualBadge}>
                          <Text style={styles.manualBadgeText}>Email entry</Text>
                        </View>
                      )}
                    </View>
                    {e.email ? <Text style={styles.entryEmail}>{e.email}</Text> : null}
                    <Text style={styles.entryDate}>Entered {formatDate(e.enteredAt)}</Text>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {entries.length > 0 && (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={handleChooseWinner}
                activeOpacity={0.85}
              >
                <Ionicons name="shuffle" size={18} color="#fff" />
                <Text style={styles.chooseBtnText}>
                  {savedWinner ? 'Re-roll Winner' : 'Choose Winner'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Add manual (email) entry modal */}
      <Modal
        visible={showAddEntry}
        animationType="fade"
        transparent
        onRequestClose={() => !addingEntry && setShowAddEntry(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Add Email Entry</Text>
            <Text style={styles.modalMeta}>
              For entries that came in over email instead of the app.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholderTextColor={colors.textTertiary}
              value={manualName}
              onChangeText={setManualName}
              placeholder="Name"
              autoCapitalize="words"
            />
            <TextInput
              style={styles.modalInput}
              placeholderTextColor={colors.textTertiary}
              value={manualEmail}
              onChangeText={setManualEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, addingEntry && styles.confirmBtnDisabled]}
              onPress={handleAddManualEntry}
              disabled={addingEntry}
              activeOpacity={0.8}
            >
              {addingEntry ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Add Entry</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddEntry(false)}
              disabled={addingEntry}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pending winner confirmation modal */}
      <Modal
        visible={pendingWinner !== null}
        animationType="fade"
        transparent
        onRequestClose={() => !savingWinner && setPendingWinner(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalHeading}>Selected Winner</Text>
            <Text style={styles.modalName}>{pendingWinner?.displayName}</Text>
            {pendingWinner?.email ? (
              <Text style={styles.modalEmail}>{pendingWinner.email}</Text>
            ) : null}
            <Text style={styles.modalMeta}>
              Randomly selected from {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, savingWinner && styles.confirmBtnDisabled]}
              onPress={handleConfirmWinner}
              disabled={savingWinner}
              activeOpacity={0.8}
            >
              {savingWinner ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Winner</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rerollBtn}
              onPress={() => { setPendingWinner(null); setTimeout(handleChooseWinner, 150); }}
              disabled={savingWinner}
            >
              <Text style={styles.rerollBtnText}>Re-roll</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPendingWinner(null)}
              disabled={savingWinner}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: { padding: 2 },
  headerTitleBlock: { flex: 1 },
  addEntryBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textTertiary, marginTop: 1 },

  scrollContent: { padding: 16 },

  // Winner section
  winnerSection: { marginBottom: 20 },
  winnerSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}12`,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  winnerBannerEmoji: { fontSize: 28 },
  winnerBannerInfo: { flex: 1 },
  winnerBannerName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  winnerBannerEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  notifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 },
  notifiedText: { fontSize: 13, color: '#34C759', fontWeight: '500' },
  manualNoteText: { fontSize: 12, color: colors.textTertiary, flex: 1, lineHeight: 16 },
  sendNotifBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendNotifBtnDisabled: { opacity: 0.5 },
  sendNotifBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textTertiary },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  entryRowWinner: {
    borderColor: `${colors.accent}50`,
    backgroundColor: `${colors.accent}08`,
  },
  entryIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIndexWinner: { backgroundColor: 'transparent' },
  entryIndexText: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
  entryIndexTrophy: { fontSize: 16 },
  entryInfo: { flex: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  manualBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  manualBadgeText: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase' },
  entryEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  entryDate: { fontSize: 12, color: colors.textTertiary, marginTop: 3 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  chooseBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chooseBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  modalName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  modalEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  modalMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 12, textAlign: 'center' },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
    width: '100%',
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rerollBtn: { paddingVertical: 10, width: '100%', alignItems: 'center', marginTop: 4 },
  rerollBtnText: { fontSize: 14, color: colors.textTertiary },
  cancelBtn: { paddingVertical: 8, width: '100%', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: colors.textTertiary },
});
