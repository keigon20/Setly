import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventStore } from '../contexts/EventStoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MusicEvent } from '../types';
import { EventPrefill, RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import StarRating from '../components/StarRating';
import OverallRatingInput from '../components/OverallRatingInput';
import { isLocalUri, uploadEventImage } from '../utils/uploadImage';
import { searchTicketmasterVenues, TicketmasterVenueResult } from '../utils/ticketmaster';
import { useFriends } from '../contexts/FriendsContext';
import { writeNotification } from '../utils/notifications';

interface AddEventScreenProps {
  // Legacy
  onClose?: () => void;
  eventToEdit?: MusicEvent;
}

export default function AddEventScreen({ onClose, eventToEdit: propEvent }: AddEventScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const eventToEdit = propEvent || (route.params as any)?.eventToEdit;
  const prefill: EventPrefill | undefined = !eventToEdit ? (route.params as any)?.prefill : undefined;
  const { addEvent, updateEvent } = useEventStore();
  const { user } = useAuth();
  const { friends } = useFriends();
  const [isSaving, setIsSaving] = useState(false);
  const [venueResults, setVenueResults] = useState<TicketmasterVenueResult[]>([]);
  const initialVenue = useRef(eventToEdit?.venue || prefill?.venue || '');

  const [title, setTitle] = useState(eventToEdit?.title || prefill?.title || '');
  const [artistsText, setArtistsText] = useState(
    eventToEdit?.artists.join(', ') || prefill?.artists.join(', ') || ''
  );
  const [venue, setVenue] = useState(eventToEdit?.venue || prefill?.venue || '');

  useEffect(() => {
    if (venue === initialVenue.current || venue.trim().length < 2) {
      setVenueResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchTicketmasterVenues(venue.trim());
        setVenueResults(results);
      } catch {
        setVenueResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [venue]);

  const handleVenueSelect = (name: string) => {
    setVenue(name);
    setVenueResults([]);
    initialVenue.current = name;
  };
  const [date, setDate] = useState(
    eventToEdit
      ? new Date(eventToEdit.date).toISOString().split('T')[0]
      : prefill?.date || new Date().toISOString().split('T')[0]
  );
  const [cost, setCost] = useState(eventToEdit?.cost.toString() || '');
  const [notes, setNotes] = useState(eventToEdit?.notes || '');
  const [imageUri, setImageUri] = useState(eventToEdit?.imageUri || prefill?.imageUri || '');
  const [overallRating, setOverallRating] = useState(eventToEdit?.overallRating ?? 0);
  const [soundRating, setSoundRating] = useState(eventToEdit?.soundRating ?? 0);
  const [crowdRating, setCrowdRating] = useState(eventToEdit?.crowdRating ?? 0);
  const [setlistRating, setSetlistRating] = useState(eventToEdit?.setlistRating ?? 0);
  const [isHidden, setIsHidden] = useState(eventToEdit?.isHidden ?? false);
  const [festivalName] = useState(eventToEdit?.festivalName || '');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!venue.trim()) {
      Alert.alert('Error', 'Please enter a venue');
      return;
    }

    const artists = artistsText
      .split(',')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0) as string[];

    setIsSaving(true);

    try {
      // Local picker URIs only resolve on this device - upload to Storage so
      // friends viewing this event from their own device can load the image too.
      let finalImageUri = imageUri;
      if (imageUri && isLocalUri(imageUri) && user) {
        finalImageUri = await uploadEventImage(imageUri, user.id);
      }

      const eventData = {
        title: title.trim(),
        artists,
        venue: venue.trim(),
        date: new Date(date),
        cost: parseFloat(cost) || 0,
        notes: notes.trim(),
        imageUri: finalImageUri || undefined,
        overallRating: overallRating || undefined,
        soundRating: soundRating || undefined,
        crowdRating: crowdRating || undefined,
        setlistRating: setlistRating || undefined,
        isHidden,
        festivalName: festivalName.trim() || undefined,
      };

      if (eventToEdit) {
        await updateEvent({
          ...eventToEdit,
          ...eventData,
        });
        navigation.goBack();
      } else {
        const newEventId = await addEvent(eventData);
        if (user) {
          friends.forEach(friend => {
            writeNotification(friend.id, {
              type: 'friend_post',
              fromUserId: user.id,
              fromDisplayName: user.displayName,
              eventId: newEventId,
              eventTitle: eventData.title,
              eventOwnerId: user.id,
            }).catch(console.error);
          });
        }
        // Creating goes through SearchEvent first, so pop all the way back to the tabs
        // instead of just one screen (which would land back on SearchEvent).
        navigation.popToTop();
      }
    } catch (error) {
      console.error('[AddEventScreen] Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
  <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {eventToEdit ? 'Edit Event' : 'Add Event'}
      </Text>
      <TouchableOpacity onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>

        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderLabel}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Coachella - Day 1, The Eras Tour - Los Angeles"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Artists (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={artistsText}
              onChangeText={setArtistsText}
              placeholder="e.g., Taylor Swift, Ed Sheeran"
            />
          </View>

          <View style={[styles.inputGroup, styles.venueGroup]}>
            <Text style={styles.label}>Venue *</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g., Madison Square Garden"
            />
            {venueResults.length > 0 && (
              <View style={styles.dropdown}>
                {venueResults.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.dropdownItem}
                    onPress={() => handleVenueSelect(v.name)}
                  >
                    <Text style={styles.dropdownItemTitle}>{v.name}</Text>
                    {(v.city || v.state) && (
                      <Text style={styles.dropdownItemSubtitle}>
                        {[v.city, v.state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.dropdownItem, styles.dropdownItemCustom]}
                  onPress={() => handleVenueSelect(venue)}
                >
                  <Text style={styles.dropdownItemCustomText}>Use "{venue}"</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cost ($)</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={cost}
              onChangeText={setCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Overall Rating</Text>
            <OverallRatingInput value={overallRating} onChange={setOverallRating} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sound</Text>
            <StarRating value={soundRating} onChange={setSoundRating} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Crowd</Text>
            <StarRating value={crowdRating} onChange={setCrowdRating} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Setlist</Text>
            <StarRating value={setlistRating} onChange={setSetlistRating} />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <Text style={styles.label}>Hide from friends</Text>
              <Text style={styles.toggleSubtext}>Hidden events never appear in friends' feeds</Text>
            </View>
            <Switch
              value={isHidden}
              onValueChange={setIsHidden}
              trackColor={{ false: colors.surfaceAlt, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about the event..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  imageSection: {
    padding: 16,
  },
  imagePicker: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  venueGroup: {
    zIndex: 100,
  },
  labelOptional: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    lineHeight: 16,
  },
  toggleSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemTitle: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dropdownItemCustom: {
    borderBottomWidth: 0,
  },
  dropdownItemCustomText: {
    fontSize: 15,
    color: colors.accent,
  },
});

