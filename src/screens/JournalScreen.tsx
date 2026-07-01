import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  TextInput,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventStore } from '../contexts/EventStoreContext';
import { MusicEvent, serializeEvent } from '../types';
import { colors } from '../theme';
import Logo from '../components/Logo';

interface JournalScreenProps {
  // Legacy props - will use navigation directly if available
  onEventPress?: (event: MusicEvent) => void;
  onAddEvent?: () => void;
}

import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


export default function JournalScreen({ onEventPress, onAddEvent }: JournalScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { events, deleteEvent } = useEventStore();
  const [searchText, setSearchText] = useState('');

  const filteredEvents = events.filter(event => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      event.title.toLowerCase().includes(search) ||
      event.artists.some(artist => artist.toLowerCase().includes(search)) ||
      event.venue.toLowerCase().includes(search) ||
      event.notes.toLowerCase().includes(search)
    );
  });

  const handleDelete = (event: MusicEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteEvent(event.id)
        }
      ]
    );
  };

  const renderEvent = ({ item }: { item: MusicEvent }) => (
    <TouchableOpacity 
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
            <Text style={styles.eventDate}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
            <Text style={styles.eventCost}>${item.cost.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start tracking your live music experiences!
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => {
        if (onAddEvent) {
          onAddEvent();
        } else {
          navigation.navigate('SearchEvent');
        }
      }}>

        <Text style={styles.emptyButtonText}>Add Your First Event</Text>
      </TouchableOpacity>
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


      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => item.id}
        contentContainerStyle={filteredEvents.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
      />

      {events.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => {
        if (onAddEvent) {
          onAddEvent();
        } else {
          navigation.navigate('SearchEvent');
        }
        }}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoRow: {
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventContent: {
    padding: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  eventArtists: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  eventCost: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
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
  emptyButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
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
  fabText: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '300',
  },
});

