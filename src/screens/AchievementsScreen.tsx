import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEventStore } from '../contexts/EventStoreContext';
import { useFriends } from '../contexts/FriendsContext';
import { MusicEvent } from '../types';
import { colors } from '../theme';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function checkB2B(events: MusicEvent[]): boolean {
  if (events.length < 2) return false;
  const days = events.map(e => {
    const d = new Date(e.date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });
  const unique = [...new Set(days)].sort((a, b) => a - b);
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] - unique[i - 1] === 86_400_000) return true;
  }
  return false;
}

function getAZCovered(events: MusicEvent[]): Set<string> {
  const covered = new Set<string>();
  events.forEach(e =>
    e.artists.forEach(artist => {
      const letter = artist.trim()[0]?.toUpperCase();
      if (letter && letter >= 'A' && letter <= 'Z') covered.add(letter);
    })
  );
  return covered;
}

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { events } = useEventStore();
  const { friends } = useFriends();

  const hasFirstEvent = events.length >= 1;
  const hasFirstFriend = friends.length >= 1;
  const hasB2B = useMemo(() => checkB2B(events), [events]);
  const azCovered = useMemo(() => getAZCovered(events), [events]);
  const hasAZ = azCovered.size === 26;

  const MILESTONES = [5, 10, 25, 50, 100];
  const totalEvents = events.length;
  const unlockedMilestones = MILESTONES.filter(m => totalEvents >= m);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.countLabel}>
          {[hasFirstEvent, hasFirstFriend, hasB2B, hasAZ].filter(Boolean).length + unlockedMilestones.length} / 9 unlocked
        </Text>

        {/* First Event */}
        <AchievementCard
          icon="musical-notes"
          name="First Event"
          description="Record your very first concert or show"
          unlocked={hasFirstEvent}
          detail={hasFirstEvent ? events[events.length - 1]?.title : undefined}
        />

        {/* First Friend */}
        <AchievementCard
          icon="people"
          name="First Friend"
          description="Connect with your first friend on Setly"
          unlocked={hasFirstFriend}
          detail={hasFirstFriend ? friends[0].displayName : undefined}
        />

        {/* B2B */}
        <AchievementCard
          icon="flash"
          name="B2B"
          description="Attend shows on back-to-back days"
          unlocked={hasB2B}
        />

        {/* A-Z */}
        <View style={[styles.card, !hasAZ && styles.cardLocked]}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, hasAZ ? styles.iconCircleUnlocked : styles.iconCircleLocked]}>
              <Ionicons
                name="text"
                size={22}
                color={hasAZ ? colors.accent : colors.textTertiary}
              />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardNameRow}>
                <Text style={[styles.cardName, !hasAZ && styles.cardNameLocked]}>A–Z</Text>
                {hasAZ
                  ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  : <Ionicons name="lock-closed" size={15} color={colors.textTertiary} />
                }
              </View>
              <Text style={styles.cardDescription}>
                See artists starting with every letter of the alphabet
              </Text>
              <Text style={styles.cardProgress}>{azCovered.size} / 26 letters</Text>
            </View>
          </View>

          {/* Letter grid */}
          <View style={styles.letterGrid}>
            {ALPHABET.map(letter => (
              <View
                key={letter}
                style={[
                  styles.letterCell,
                  azCovered.has(letter) ? styles.letterCellDone : styles.letterCellMissing,
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    azCovered.has(letter) ? styles.letterTextDone : styles.letterTextMissing,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Show milestones */}
        <Text style={styles.sectionTitle}>Show Milestones</Text>
        <View style={styles.milestoneGrid}>
          {MILESTONES.map(milestone => {
            const unlocked = totalEvents >= milestone;
            return (
              <View key={milestone} style={[styles.milestoneCard, !unlocked && styles.milestoneCardLocked]}>
                <Ionicons
                  name="ticket"
                  size={20}
                  color={unlocked ? colors.accent : colors.textTertiary}
                  style={styles.milestoneIcon}
                />
                <Text style={[styles.milestoneNumber, !unlocked && styles.milestoneNumberLocked]}>
                  {milestone}
                </Text>
                <Text style={styles.milestoneLabel}>shows</Text>
                {unlocked
                  ? <Ionicons name="checkmark-circle" size={14} color={colors.accent} style={styles.milestoneBadge} />
                  : <Ionicons name="lock-closed" size={12} color={colors.textTertiary} style={styles.milestoneBadge} />
                }
              </View>
            );
          })}
        </View>

        {totalEvents < 100 && (
          <Text style={styles.milestoneProgress}>
            {totalEvents} / {MILESTONES.find(m => totalEvents < m) ?? 100} shows toward next milestone
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

interface AchievementCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  name: string;
  description: string;
  unlocked: boolean;
  detail?: string;
}

function AchievementCard({ icon, name, description, unlocked, detail }: AchievementCardProps) {
  return (
    <View style={[styles.card, !unlocked && styles.cardLocked]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconCircle, unlocked ? styles.iconCircleUnlocked : styles.iconCircleLocked]}>
          <Ionicons
            name={icon}
            size={22}
            color={unlocked ? colors.accent : colors.textTertiary}
          />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, !unlocked && styles.cardNameLocked]}>{name}</Text>
            {unlocked
              ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              : <Ionicons name="lock-closed" size={15} color={colors.textTertiary} />
            }
          </View>
          <Text style={styles.cardDescription}>{description}</Text>
          {detail && <Text style={styles.cardDetail} numberOfLines={1}>{detail}</Text>}
        </View>
      </View>
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
    paddingBottom: 16,
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
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  milestoneCard: {
    width: '18%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  milestoneCardLocked: {
    opacity: 0.45,
  },
  milestoneIcon: {
    marginBottom: 6,
  },
  milestoneNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  milestoneNumberLocked: {
    color: colors.textSecondary,
  },
  milestoneLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  milestoneBadge: {
    marginTop: 2,
  },
  milestoneProgress: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 8,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  iconCircleUnlocked: {
    backgroundColor: `${colors.accent}22`,
    borderWidth: 1,
    borderColor: `${colors.accent}55`,
  },
  iconCircleLocked: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardNameLocked: {
    color: colors.textSecondary,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 6,
  },
  cardProgress: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  letterCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterCellDone: {
    backgroundColor: `${colors.accent}22`,
    borderWidth: 1,
    borderColor: `${colors.accent}55`,
  },
  letterCellMissing: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  letterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  letterTextDone: {
    color: colors.accent,
  },
  letterTextMissing: {
    color: colors.textTertiary,
  },
});
