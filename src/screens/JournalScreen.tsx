import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventStore } from '../contexts/EventStoreContext';
import { MusicEvent, serializeEvent } from '../types';
import { colors } from '../theme';
import Logo from '../components/Logo';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type JournalItem =
  | { type: 'festival'; groupKey: string; name: string; events: MusicEvent[] }
  | { type: 'event'; event: MusicEvent };

interface JournalScreenProps {
  onEventPress?: (event: MusicEvent) => void;
  onAddEvent?: () => void;
}

export default function JournalScreen({ onEventPress, onAddEvent }: JournalScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { events, deleteEvent } = useEventStore();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'groups'>('all');

  const filteredEvents = useMemo(() => {
    if (!searchText) return events;
    const search = searchText.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(search) ||
      event.artists.some(a => a.toLowerCase().includes(search)) ||
      event.venue.toLowerCase().includes(search) ||
      event.notes.toLowerCase().includes(search) ||
      (event.festivalName?.toLowerCase().includes(search) ?? false)
    );
  }, [events, searchText]);

  // Group key: festivalName if set, otherwise the event title.
  // Events sharing the same group key with 2+ members are shown as a group.
  const journalItems = useMemo<JournalItem[]>(() => {
    const groupMap = new Map<string, MusicEvent[]>();
    for (const event of filteredEvents) {
      const key = event.festivalName ?? event.title;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(event);
    }

    const seen = new Set<string>();
    const items: JournalItem[] = [];

    for (const event of filteredEvents) {
      const key = event.festivalName ?? event.title;
      const group = groupMap.get(key)!;

      if (group.length >= 2) {
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ type: 'festival', groupKey: key, name: key, events: group });
        }
      } else {
        items.push({ type: 'event', event });
      }
    }

    return items;
  }, [filteredEvents]);

  const displayItems = useMemo(() => {
    if (activeTab === 'groups') return journalItems.filter(i => i.type === 'festival');
    return journalItems;
  }, [journalItems, activeTab]);

  const handleDelete = (event: MusicEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
      ]
    );
  };

  const renderEventCard = (item: MusicEvent) => (
    <TouchableOpacity
      key={item.id}
      style={styles.eventCard}
      onPress={() => {
        if (onEventPress) {
          onEventPress(item);
        } else {
          navigation.navigate('EventDetail', { event: serializeEvent(item) });
        }
      }}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.eventContent}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventArtists}>{item.artists.join(', ')}</Text>
          <Text style={styles.eventVenue}>{item.venue}</Text>
          <View style={styles.eventMeta}>
            <Text style={styles.eventDate}>{new Date(item.date).toLocaleDateString()}</Text>
            <Text style={styles.eventCost}>${item.cost.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: JournalItem }) => {
    if (item.type === 'festival') {
      return (
        <View style={styles.festivalGroup}>
          <View style={styles.festivalHeader}>
            <Text style={styles.festivalHeaderText}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('GroupEdit', { groupKey: item.groupKey })}
            >
              <Text style={styles.editGroupText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {item.events.map(e => renderEventCard(e))}
        </View>
      );
    }
    return renderEventCard(item.event);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {activeTab === 'groups' ? 'No Groups Yet' : 'No Events Yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'groups'
          ? 'Events with the same title are automatically grouped here.'
          : 'Start tracking your live music experiences!'}
      </Text>
      {activeTab === 'all' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => onAddEvent ? onAddEvent() : navigation.navigate('SearchEvent')}
        >
          <Text style={styles.emptyButtonText}>Add Your First Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.logoRow, { paddingTop: insets.top + 16 }]}>
        <Logo />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Tours & Festivals
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={item =>
          item.type === 'festival' ? `festival-${item.groupKey}` : item.event.id
        }
        contentContainerStyle={displayItems.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
      />

      {events.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => onAddEvent ? onAddEvent() : navigation.navigate('SearchEvent')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  logoRow: { paddingHorizontal: 16, backgroundColor: colors.background },
  searchContainer: { padding: 16, paddingBottom: 8, backgroundColor: colors.background },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary },
  list: { padding: 16 },
  emptyList: { flex: 1 },
  festivalGroup: { marginBottom: 12 },
  festivalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  festivalHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editGroupText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventContent: { padding: 16 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  eventArtists: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  eventVenue: { fontSize: 14, color: colors.textTertiary, marginBottom: 8 },
  eventMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  eventDate: { fontSize: 12, color: colors.textTertiary },
  eventCost: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: colors.textPrimary, fontSize: 30, fontWeight: '300' },
});
