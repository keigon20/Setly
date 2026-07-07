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
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Giveaway } from '../types';
import { colors } from '../theme';

export default function GiveawaysScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enteredIds, setEnteredIds] = useState<Set<string>>(new Set());
  const [tcModal, setTcModal] = useState<Giveaway | null>(null);
  const [entering, setEntering] = useState(false);

  const checkEntries = async (items: Giveaway[]) => {
    if (!user || items.length === 0) return;
    const results = await Promise.all(
      items.map(g => getDoc(doc(db, 'giveaways', g.id, 'entries', user.id))),
    );
    const entered = new Set<string>();
    results.forEach((snap, i) => {
      if (snap.exists()) entered.add(items[i].id);
    });
    setEnteredIds(entered);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'giveaways'),
      where('active', '==', true),
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const items: Giveaway[] = snap.docs.map(d => ({
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
        }));
        items.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
        setGiveaways(items);
        setLoading(false);
        checkEntries(items);
      },
      err => {
        console.warn('[Giveaways] listener error:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkEntries(giveaways);
    setRefreshing(false);
  };

  const handleEnter = async (giveaway: Giveaway) => {
    if (!user) return;
    setEntering(true);
    try {
      await setDoc(doc(db, 'giveaways', giveaway.id, 'entries', user.id), {
        userId: user.id,
        enteredAt: serverTimestamp(),
      });
      setEnteredIds(prev => new Set([...prev, giveaway.id]));
      setTcModal(null);
      Alert.alert("You're entered!", 'Good luck! Winners will be contacted via email.');
    } catch {
      Alert.alert('Error', 'Failed to enter giveaway. Please try again.');
    } finally {
      setEntering(false);
    }
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={{ paddingTop: insets.top + 16 }}>
          <Text style={styles.screenTitle}>Giveaways</Text>
        </View>

        {giveaways.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={52} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No active giveaways</Text>
            <Text style={styles.emptySubtitle}>Check back soon!</Text>
          </View>
        ) : (
          giveaways.map(g => {
            const entered = enteredIds.has(g.id);
            const isPast = g.deadline < new Date();
            return (
              <View key={g.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{g.eventTitle}</Text>
                  {isPast && <Text style={styles.closedBadge}>Closed</Text>}
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>{formatDate(g.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>{g.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="ticket-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>{g.ticketType}</Text>
                </View>

                <View style={styles.deadlineRow}>
                  <Text style={styles.deadlineLabel}>Entry deadline  </Text>
                  <Text style={[styles.deadlineValue, isPast && styles.deadlineValuePast]}>
                    {formatDate(g.deadline)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.enterBtn, (entered || isPast) && styles.enterBtnDisabled]}
                  disabled={entered || isPast}
                  onPress={() => setTcModal(g)}
                  activeOpacity={0.8}
                >
                  {entered ? (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                      <Text style={styles.enterBtnEnteredText}>Entered</Text>
                    </>
                  ) : (
                    <Text style={[styles.enterBtnText, isPast && styles.enterBtnTextDisabled]}>
                      {isPast ? 'Deadline Passed' : 'Enter Giveaway'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Terms & Conditions modal */}
      <Modal
        visible={tcModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !entering && setTcModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>{tcModal?.eventTitle}</Text>
            </View>
            <TouchableOpacity onPress={() => setTcModal(null)} hitSlop={8} disabled={entering}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.termsText}>{tcModal?.terms}</Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterNote}>
              By tapping "Accept & Enter" you agree to the terms and conditions above.
            </Text>
            <TouchableOpacity
              style={[styles.acceptBtn, entering && styles.acceptBtnDisabled]}
              disabled={entering}
              onPress={() => tcModal && handleEnter(tcModal)}
              activeOpacity={0.8}
            >
              {entering ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept &amp; Enter</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setTcModal(null)}
              disabled={entering}
            >
              <Text style={styles.declineBtnText}>Cancel</Text>
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
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },

  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  emptySubtitle: { fontSize: 14, color: colors.textTertiary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  eventTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  closedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 14 },
  deadlineLabel: { fontSize: 13, color: colors.textTertiary },
  deadlineValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  deadlineValuePast: { color: colors.destructive },

  enterBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  enterBtnDisabled: { backgroundColor: colors.surfaceAlt },
  enterBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  enterBtnTextDisabled: { color: colors.textTertiary },
  enterBtnEnteredText: { fontSize: 15, fontWeight: '600', color: colors.accent },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitleBlock: { flex: 1, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalSubtitle: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20 },
  termsText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  modalFooter: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalFooterNote: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 2,
  },
  acceptBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnDisabled: { opacity: 0.5 },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  declineBtnText: { fontSize: 15, fontWeight: '500', color: colors.textSecondary },
});
