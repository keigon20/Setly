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
  isHidden?: boolean;
  festivalName?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  isAdmin?: boolean;
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

export type ReportContentType = 'event' | 'comment' | 'reply' | 'user';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
