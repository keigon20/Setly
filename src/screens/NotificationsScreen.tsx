import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNotifications } from '../contexts/NotificationsContext';
import { useEventStore } from '../contexts/EventStoreContext';
import { AppNotification, MusicEvent, serializeEvent } from '../types';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function notificationBody(n: AppNotification): string {
  switch (n.type) {
    case 'friend_request':
      return `${n.fromDisplayName} sent you a friend request`;
    case 'friend_post':
      return `${n.fromDisplayName} logged an event${n.eventTitle ? `: ${n.eventTitle}` : ''}`;
    case 'event_like':
      return `${n.fromDisplayName} liked your event${n.eventTitle ? ` "${n.eventTitle}"` : ''}`;
    case 'event_comment':
      return `${n.fromDisplayName} commented on your event${n.eventTitle ? ` "${n.eventTitle}"` : ''}`;
    case 'comment_reply':
      return `${n.fromDisplayName} replied to your comment${n.eventTitle ? ` on "${n.eventTitle}"` : ''}`;
    case 'content_under_review':
    case 'report_outcome':
    case 'new_report':
      return n.message ?? 'You have a moderation update.';
  }
}

async function fetchEvent(eventId: string): Promise<MusicEvent | null> {
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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { getEventById } = useEventStore();
  const navigating = useRef(false);

  useEffect(() => {
    return () => {
      markAllRead();
    };
  }, []);

  const handlePress = async (n: AppNotification) => {
    if (navigating.current) return;
    navigating.current = true;
    markRead(n.id);

    try {
      if (n.type === 'friend_request') {
        navigation.navigate('Friends');
        return;
      }

      if (n.type === 'comment_reply' && n.eventId && n.eventOwnerId) {
        navigation.navigate('Comments', {
          eventId: n.eventId,
          eventTitle: n.eventTitle,
          eventOwnerId: n.eventOwnerId,
        });
        return;
      }

      if (n.eventId) {
        const event = getEventById(n.eventId) ?? await fetchEvent(n.eventId);
        if (event) {
          navigation.navigate('EventDetail', { event: serializeEvent(event) });
        }
      }
    } finally {
      navigating.current = false;
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => handlePress(item)}
    >
      {!item.read && <View style={styles.unreadDot} />}
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{notificationBody(item)}</Text>
        <Text style={styles.itemTime}>
          {item.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet</Text>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  markAllRead: {
    fontSize: 14,
    color: colors.accent,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnread: {
    borderColor: colors.accent,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 10,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 14,
    marginTop: 40,
  },
});
