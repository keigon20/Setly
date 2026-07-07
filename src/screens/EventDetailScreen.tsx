import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Alert
} from 'react-native';
import { useEventStore } from '../contexts/EventStoreContext';
import { MusicEvent, deserializeEvent } from '../types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import StarRating from '../components/StarRating';
import CommentThread from '../components/CommentThread';
import ShareTicketButton from '../components/ShareTicketButton';
import { useEventSocial } from '../hooks/useEventSocial';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EventDetailScreenProps {
  event?: MusicEvent;
  onEdit?: (event: MusicEvent) => void;
  onClose?: () => void;
}

export default function EventDetailScreen({ event: propEvent, onEdit, onClose }: EventDetailScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const rawParam = (route.params as any)?.event;
  const event = propEvent || (rawParam ? deserializeEvent(rawParam) : undefined);
  const { deleteEvent } = useEventStore();
  const { likes, comments, addComment, deleteComment } = useEventSocial(event?.id || '');
  const [commentText, setCommentText] = useState('');
  if (!event) return null;

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(commentText);
    setCommentText('');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(event.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
      {event.imageUri && (
        <Image source={{ uri: event.imageUri }} style={styles.image} />
      )}

      <View style={styles.content}>
        {event.festivalName && (
          <Text style={styles.festivalTag}>{event.festivalName}</Text>
        )}
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Artists:</Text>
          <Text style={styles.detailValue}>{event.artists.join(', ')}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Venue:</Text>
          <Text style={styles.detailValue}>{event.venue}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cost:</Text>
          <Text style={styles.costValue}>${event.cost.toFixed(2)}</Text>
        </View>

        {(event.overallRating || event.soundRating || event.crowdRating || event.setlistRating) && (
          <View style={styles.ratingsSection}>
            {event.overallRating !== undefined && (
              <View style={styles.overallRatingRow}>
                <Text style={styles.overallRatingLabel}>Overall</Text>
                <Text style={styles.overallRatingValue}>{event.overallRating.toFixed(1)}/10</Text>
              </View>
            )}
            {event.soundRating !== undefined && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Sound</Text>
                <StarRating value={event.soundRating} size={18} />
              </View>
            )}
            {event.crowdRating !== undefined && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Crowd</Text>
                <StarRating value={event.crowdRating} size={18} />
              </View>
            )}
            {event.setlistRating !== undefined && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Setlist</Text>
                <StarRating value={event.setlistRating} size={18} />
              </View>
            )}
          </View>
        )}

        {event.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{event.notes}</Text>
          </View>
        )}

        <View style={styles.socialSection}>
          <Text style={styles.socialSectionTitle}>
            {likes.length === 0 ? 'No likes yet' : `Liked by ${likes.map(l => l.displayName).join(', ')}`}
          </Text>

          <Text style={[styles.socialSectionTitle, styles.commentsTitle]}>
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>

          {comments.map(comment => (
            <CommentThread
              key={comment.id}
              eventId={event.id}
              comment={comment}
              onDeleteComment={() => deleteComment(comment.id)}
              isPostOwner
            />
          ))}

          {comments.length === 0 && (
            <Text style={styles.noCommentsText}>No comments yet.</Text>
          )}

          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.addCommentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity style={styles.addCommentButton} onPress={handleSendComment}>
              <Text style={styles.addCommentButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.metaText}>
            Added: {new Date(event.createdAt).toLocaleDateString()}
          </Text>
          {event.updatedAt && (
            <Text style={styles.metaText}>
              Updated: {new Date(event.updatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <ShareTicketButton event={event} />

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('AddEvent', { eventToEdit: event })}
          >
            <Text style={styles.editButtonText}>Edit Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Event</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 20,
  },
  festivalTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 70,
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  costValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ratingsSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  overallRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallRatingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  overallRatingValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  socialSection: {
    marginTop: 20,
  },
  socialSectionTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
  },
  noCommentsText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  addCommentRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginRight: 8,
  },
  addCommentButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addCommentButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  metaSection: {
    marginTop: 20,
    paddingVertical: 12,
  },
  metaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.destructive,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.destructive,
    fontSize: 16,
    fontWeight: '600',
  },
});
