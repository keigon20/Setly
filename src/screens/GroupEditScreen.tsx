import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventStore } from '../contexts/EventStoreContext';
import { MusicEvent } from '../types';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { groupKey } = route.params as { groupKey: string };
  const { events, updateEventGroup } = useEventStore();
  const [isSaving, setIsSaving] = useState(false);

  const getGroupKey = (e: MusicEvent) => e.festivalName ?? e.title;

  // Events currently in this group
  const originalGroupEvents = useMemo(
    () => events.filter(e => getGroupKey(e) === groupKey),
    [events, groupKey]
  );

  // Events not in this group
  const otherEvents = useMemo(
    () => events.filter(e => getGroupKey(e) !== groupKey),
    [events, groupKey]
  );

  const [groupName, setGroupName] = useState(groupKey);
  // Track which event IDs are currently in the group
  const [groupIds, setGroupIds] = useState<Set<string>>(
    new Set(originalGroupEvents.map(e => e.id))
  );

  const toggleEvent = (id: string) => {
    setGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Group name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const allEventIds = events.map(e => e.id);
      const toAdd = allEventIds.filter(id => groupIds.has(id));
      const toRemove = allEventIds.filter(
        id => !groupIds.has(id) && getGroupKey(events.find(e => e.id === id)!) === groupKey
      );

      // For events staying/joining the group: set festivalName (or clear it if it matches their title)
      const addPromise = toAdd.length > 0
        ? updateEventGroup(
            toAdd,
            // If the new group name matches every event's own title, we don't need
            // to store it — auto-grouping will handle it. But storing it explicitly
            // is safe and avoids edge cases when titles differ.
            trimmedName
          )
        : Promise.resolve();

      // For events removed from the group: clear festivalName so they auto-group by title again
      const removePromise = toRemove.length > 0
        ? updateEventGroup(toRemove, undefined)
        : Promise.resolve();

      await Promise.all([addPromise, removePromise]);
      navigation.goBack();
    } catch (e) {
      console.error('[GroupEdit] save failed:', e);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEvent = (item: MusicEvent, inGroup: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={styles.eventRow}
      onPress={() => toggleEvent(item.id)}
    >
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventMeta}>
          {new Date(item.date).toLocaleDateString()} · {item.venue}
        </Text>
      </View>
      <View style={[styles.checkbox, groupIds.has(item.id) && styles.checkboxActive]}>
        {groupIds.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );

  const allEventsSorted = useMemo(() => {
    return [...events].sort((a, b) => {
      const aIn = groupIds.has(a.id) ? 0 : 1;
      const bIn = groupIds.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [events, groupIds]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Group</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveText}>{isSaving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nameSection}>
        <Text style={styles.sectionLabel}>Group Name</Text>
        <TextInput
          style={styles.nameInput}
          value={groupName}
          onChangeText={setGroupName}
          placeholderTextColor={colors.textTertiary}
          placeholder="e.g., Coachella 2026"
        />
        <Text style={styles.nameHint}>
          Rename to split this group (e.g. "Coachella 2025" vs "Coachella 2026").
        </Text>
      </View>

      <Text style={styles.sectionLabel} >Events</Text>
      <Text style={styles.sectionSub}>Checked events are in this group. Tap to add or remove.</Text>

      <FlatList
        data={allEventsSorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => renderEvent(item, groupIds.has(item.id))}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: { fontSize: 16, color: colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  saveText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  nameSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: colors.textTertiary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    lineHeight: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  eventMeta: { fontSize: 13, color: colors.textTertiary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: { fontSize: 14, color: colors.textPrimary, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border },
});
