// Serialized form used when passing a MusicEvent through React Navigation params.
// Date fields become ISO strings so the state is JSON-serializable.
export type SerializedMusicEvent = Omit<MusicEvent, 'date' | 'createdAt' | 'updatedAt'> & {
  date: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeEvent(e: MusicEvent): SerializedMusicEvent {
  return { ...e, date: e.date.toISOString(), createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() };
}

export function deserializeEvent(e: SerializedMusicEvent): MusicEvent {
  return { ...e, date: new Date(e.date), createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) };
}

// Music Event type definition
export interface MusicEvent {
  id: string;
  title: string;
  artists: string[];
  venue: string;
  date: Date;
  cost: number;
  notes: string;
  imageUri?: string;
  overallRating?: number; // 0.0 - 10.0
  soundRating?: number; // 1 - 5
  crowdRating?: number; // 1 - 5
  setlistRating?: number; // 1 - 5
  isHidden?: boolean; // hidden from friends' feed
  festivalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// An event as it appears in a friend's feed - includes the owner's identity
export interface FeedEvent extends MusicEvent {
  userId: string;
  userDisplayName: string;
}

export interface Friend {
  id: string; // friend's uid
  displayName: string;
  email: string;
  addedAt: Date;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromEmail: string;
  toUserId: string;
  toDisplayName: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface EventComment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Date;
}

export interface EventLike {
  userId: string;
  displayName: string;
  createdAt: Date;
}

export interface BlockedUser {
  id: string; // blocked user's uid
  displayName: string;
  blockedAt: Date;
}

export type ReportContentType = 'event' | 'comment' | 'reply' | 'user';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export interface ReportInput {
  reportedUserId: string;
  contentType: ReportContentType;
  eventId?: string;
  commentId?: string;
  replyId?: string;
  reason: ReportReason;
  details?: string;
}

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  isAdmin?: boolean;
}

// Statistics type
export interface YearStatistics {
  year: number;
  totalEvents: number;
  totalMoneySpent: number;
  uniqueArtists: number;
  uniqueVenues: number;
  favoriteArtist?: string;
  averageCost: number;
  mostRecentEvent?: MusicEvent;
  oldestEvent?: MusicEvent;
}

export type AppNotificationType =
  | 'friend_request'
  | 'friend_post'
  | 'event_like'
  | 'event_comment'
  | 'comment_reply'
  | 'content_under_review'
  | 'report_outcome'
  | 'new_report'
  | 'giveaway_winner';

export interface NotificationPrefs {
  all: boolean;
  friendRequest: boolean;
  friendPost: boolean;
  eventLike: boolean;
  eventComment: boolean;
  commentReply: boolean;
  eventReminder: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  all: true,
  friendRequest: true,
  friendPost: true,
  eventLike: true,
  eventComment: true,
  commentReply: true,
  eventReminder: true,
};

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  fromUserId: string;
  fromDisplayName: string;
  eventId?: string;
  eventTitle?: string;
  eventOwnerId?: string;
  message?: string;
  read: boolean;
  createdAt: Date;
}

export interface Giveaway {
  id: string;
  eventTitle: string;
  date: Date;
  location: string;
  ticketType: string;
  deadline: Date;
  terms: string;
  active: boolean;
  createdAt: Date;
  createdBy: string;
}

// Auth state type
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

