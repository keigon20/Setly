import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../utils/firebase';
import { colors } from '../theme';
import { useFriends } from '../contexts/FriendsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { FeedEvent } from '../types';
import FeedEventCard from '../components/FeedEventCard';
import FeedAdCard from '../components/FeedAdCard';
import Logo from '../components/Logo';
import { loadSeenEventIds, markEventsSeen } from '../utils/seenEvents';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_FRIENDS_PER_QUERY = 30; // Firestore 'in' query limit
const FEED_QUERY_LIMIT = 100; // Cap the live listener so we never sync someone's entire history
const PAGE_SIZE = 8;
const AD_INTERVAL = 5; // show one native ad card after every 5 event posts

type FeedListItem =
  | { type: 'event'; event: FeedEvent }
  | { type: 'ad' }
  | { type: 'loadOlder' }
  | { type: 'caughtUp' };

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { unreadCount } = useNotifications();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Frozen for the lifetime of this screen session - what was already seen as of opening
  // the feed. Newly-viewed events are persisted for *next* time via markEventsSeen, but
  // must not feed back into this partition or every item would cascade into "seen" on mount.
  const [baselineSeenIds, setBaselineSeenIds] = useState<Set<string> | null>(null);
  const [unseenShown, setUnseenShown] = useState(PAGE_SIZE);
  const [seenShown, setSeenShown] = useState(0);

  useEffect(() => {
    if (user) {
      loadSeenEventIds(user.id).then(setBaselineSeenIds);
    } else {
      // Guests have no account to key seen-state off of, and no friends/feed anyway.
      setBaselineSeenIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    if (friends.length === 0) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const friendIds = friends.slice(0, MAX_FRIENDS_PER_QUERY).map(f => f.id);
    const q = query(
      collection(db, 'events'),
      where('userId', 'in', friendIds),
      where('isHidden', '==', false),
      orderBy('date', 'desc'),
      limit(FEED_QUERY_LIMIT)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const loaded: FeedEvent[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          userDisplayName: data.userDisplayName || 'Friend',
          title: data.title,
          artists: data.artists || [],
          venue: data.venue,
          date: data.date?.toDate() || new Date(),
          cost: data.cost ?? null,
          notes: data.notes || '',
          imageUri: data.imageUri || undefined,
          overallRating: data.overallRating,
          soundRating: data.soundRating,
          crowdRating: data.crowdRating,
          setlistRating: data.setlistRating,
          isHidden: data.isHidden || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
      setEvents(loaded);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [friends]);

  const unseenEvents = useMemo(
    () => {
      if (!baselineSeenIds) return [];
      return events
        .filter(e => !baselineSeenIds.has(e.id))
        .sort((a, b) => a.date.getTime() - b.date.getTime()); // oldest unseen first
    },
    [events, baselineSeenIds]
  );

  const seenEvents = useMemo(
    () => {
      if (!baselineSeenIds) return [];
      return events
        .filter(e => baselineSeenIds.has(e.id))
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // newest seen first
    },
    [events, baselineSeenIds]
  );

  const visibleUnseen = unseenEvents.slice(0, unseenShown);
  const hasMoreUnseen = unseenShown < unseenEvents.length;
  const visibleSeen = hasMoreUnseen ? [] : seenEvents.slice(0, seenShown);
  const hasMoreSeen = seenShown < seenEvents.length;

  // Persist whatever is currently visible from the unseen pool as seen, for next time.
  // This intentionally does not feed back into baselineSeenIds during this session.
  const visibleUnseenKey = visibleUnseen.map(e => e.id).join(',');
  useEffect(() => {
    if (!user || visibleUnseen.length === 0) return;
    markEventsSeen(user.id, visibleUnseen.map(e => e.id));
  }, [visibleUnseenKey, user]);

  const handleEndReached = () => {
    if (hasMoreUnseen) {
      setUnseenShown(prev => prev + PAGE_SIZE);
    }
  };

  const handleLoadOlder = () => {
    setSeenShown(prev => prev + PAGE_SIZE);
  };

  const listItems: FeedListItem[] = [];
  let adInserted = false;
  [...visibleUnseen, ...visibleSeen].forEach((event, i) => {
    listItems.push({ type: 'event', event });
    if ((i + 1) % AD_INTERVAL === 0) {
      listItems.push({ type: 'ad' });
      adInserted = true;
    }
  });

  // Always show at least one ad when there are any friend events, even if
  // the total count hasn't hit the interval threshold yet.
  const totalVisible = visibleUnseen.length + visibleSeen.length;
  if (totalVisible > 0 && !adInserted) {
    listItems.push({ type: 'ad' });
  }

  if (!hasMoreUnseen && events.length > 0) {
    listItems.push({ type: 'caughtUp' });
    if (hasMoreSeen) {
      listItems.push({ type: 'loadOlder' });
    }
  }

  if (isLoading || baselineSeenIds === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Logo />
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications')}
          hitSlop={8}
        >
          <Ionicons name="notifications" size={24} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    <FlatList
      style={styles.list}
      data={listItems}
      keyExtractor={(item, index) => item.type === 'event' ? item.event.id : `${item.type}-${index}`}
      contentContainerStyle={styles.listContent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <Text style={styles.heading}>Friends</Text>
      }
      renderItem={({ item }) => {
        if (item.type === 'loadOlder') {
          return (
            <TouchableOpacity style={styles.loadOlderButton} onPress={handleLoadOlder}>
              <Text style={styles.loadOlderText}>Load older posts</Text>
            </TouchableOpacity>
          );
        }
        if (item.type === 'caughtUp') {
          return <Text style={styles.caughtUpText}>You're all caught up</Text>;
        }
        if (item.type === 'ad') {
          return <FeedAdCard />;
        }
        return (
          <FeedEventCard
            event={item.event}
            onPressComments={() => navigation.navigate('Comments', { eventId: item.event.id, eventTitle: item.event.title, eventOwnerId: item.event.userId })}
          />
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {friends.length === 0 ? 'No friends yet' : 'No events yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {friends.length === 0
              ? 'Add friends from your Profile to see their events here.'
              : "Your friends haven't logged any events yet."}
          </Text>
        </View>
      }
    />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 16,
  },
  loadOlderButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  loadOlderText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  caughtUpText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
