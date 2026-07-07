import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from '../theme';
import { FeedEvent, ReportReason } from '../types';
import { useStaticEventSocial } from '../hooks/useStaticEventSocial';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendsContext';
import { submitReport } from '../utils/reports';
import ReportModal from './ReportModal';

interface FeedEventCardProps {
  event: FeedEvent;
  onPressComments: () => void;
}

export default function FeedEventCard({ event, onPressComments }: FeedEventCardProps) {
  const { likeCount, isLikedByMe, toggleLike, commentCount } = useStaticEventSocial(event.id, event.userId, event.title);
  const { user } = useAuth();
  const { blockUser } = useFriends();
  const [showReportModal, setShowReportModal] = useState(false);
  const isUpcoming = new Date(event.date) >= new Date();

  const handleBlock = () => {
    Alert.alert(
      'Block ' + event.userDisplayName,
      'You will no longer see their events, and they will no longer see yours. This removes your friendship.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => blockUser(event.userId, event.userDisplayName),
        },
      ]
    );
  };

  const handleOptions = () => {
    Alert.alert(
      event.userDisplayName,
      undefined,
      [
        { text: 'Report Event', onPress: () => setShowReportModal(true) },
        { text: `Block ${event.userDisplayName}`, style: 'destructive', onPress: handleBlock },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitReport = async (reason: ReportReason, details: string) => {
    if (!user) return;
    await submitReport(user.id, {
      reportedUserId: event.userId,
      contentType: 'event',
      eventId: event.id,
      reason,
      details,
    });
    setShowReportModal(false);
    Alert.alert('Report submitted', 'Thank you for letting us know.');
  };

  return (
    <View style={styles.card}>
      <View style={styles.ownerRow}>
        <Text style={styles.owner}>{event.userDisplayName}</Text>
        <TouchableOpacity onPress={handleOptions} hitSlop={8}>
          <Text style={styles.optionsButton}>···</Text>
        </TouchableOpacity>
      </View>

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
      />

      {event.imageUri && (
        <Image source={{ uri: event.imageUri }} style={styles.image} />
      )}

      <View style={styles.content}>
        {event.festivalName && (
          <Text style={styles.festivalTag}>{event.festivalName}</Text>
        )}
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.artists}>{event.artists.join(', ')}</Text>
        <Text style={styles.venue}>{event.venue}</Text>
        <Text style={styles.date}>
          {isUpcoming ? 'Upcoming · ' : ''}{new Date(event.date).toLocaleDateString()}
        </Text>

        {event.overallRating !== undefined && (
          <Text style={styles.rating}>Rated {event.overallRating.toFixed(1)}/10</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
            <Text style={[styles.actionText, isLikedByMe && styles.actionTextActive]}>
              {isLikedByMe ? 'Liked' : 'Like'}{likeCount > 0 ? ` (${likeCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onPressComments}>
            <Text style={styles.actionText}>
              Comment{commentCount > 0 ? ` (${commentCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  optionsButton: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textTertiary,
    paddingHorizontal: 4,
  },
  owner: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  image: {
    width: '100%',
    height: 180,
    marginTop: 8,
  },
  content: {
    padding: 16,
  },
  festivalTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  artists: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  venue: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  rating: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionTextActive: {
    color: colors.accent,
  },
});
