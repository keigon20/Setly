import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

initializeApp();
const db = getFirestore();
const expo = new Expo();

// Keep this in sync with src/types/index.ts's AppNotificationType/NotificationPrefs
// and the TYPE_TO_PREF map in src/contexts/NotificationsContext.tsx — this
// Cloud Function can't import from the app's src/ (separate deploy bundle),
// so the mapping is intentionally duplicated here.
type AppNotificationType =
  | 'friend_request'
  | 'friend_post'
  | 'event_like'
  | 'event_comment'
  | 'comment_reply'
  | 'content_under_review'
  | 'report_outcome'
  | 'new_report'
  | 'giveaway_winner';

interface NotificationPrefs {
  all: boolean;
  friendRequest: boolean;
  friendPost: boolean;
  eventLike: boolean;
  eventComment: boolean;
  commentReply: boolean;
  eventReminder: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  all: true,
  friendRequest: true,
  friendPost: true,
  eventLike: true,
  eventComment: true,
  commentReply: true,
  eventReminder: true,
};

const TYPE_TO_PREF: Partial<Record<AppNotificationType, keyof NotificationPrefs>> = {
  friend_request: 'friendRequest',
  friend_post: 'friendPost',
  event_like: 'eventLike',
  event_comment: 'eventComment',
  comment_reply: 'commentReply',
};

const TYPE_TO_TITLE: Record<AppNotificationType, string> = {
  friend_request: 'Friend Request',
  friend_post: 'New Post',
  event_like: 'New Like',
  event_comment: 'New Comment',
  comment_reply: 'New Reply',
  content_under_review: 'Setly',
  report_outcome: 'Setly',
  new_report: 'Setly',
  giveaway_winner: '🎉 You Won!',
};

interface NotificationDoc {
  type: AppNotificationType;
  fromDisplayName: string;
  eventId?: string;
  eventTitle?: string;
  eventOwnerId?: string;
  message?: string;
}

// Mirrors notificationBody() in src/screens/NotificationsScreen.tsx — keep
// the two in sync; this is the same display text used in-app.
function notificationBody(n: NotificationDoc): string {
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
    case 'giveaway_winner':
      return n.message ?? 'You won a giveaway!';
  }
}

function isPushAllowed(type: AppNotificationType, prefs: NotificationPrefs): boolean {
  if (!prefs.all) return false;
  const prefKey = TYPE_TO_PREF[type];
  return prefKey ? prefs[prefKey] : true;
}

export const sendPushOnNotificationCreate = onDocumentCreated(
  'notifications/{userId}/items/{itemId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const userId = event.params.userId;
    const notification = snap.data() as NotificationDoc;

    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) return;
    const userData = userSnap.data() || {};

    const pushTokens: string[] = userData.pushTokens || [];
    if (pushTokens.length === 0) return;

    const prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(userData.notificationPrefs || {}) };
    if (!isPushAllowed(notification.type, prefs)) return;

    const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      title: TYPE_TO_TITLE[notification.type],
      body: notificationBody(notification),
      sound: 'default',
      data: {
        type: notification.type,
        eventId: notification.eventId,
        eventOwnerId: notification.eventOwnerId,
        eventTitle: notification.eventTitle,
      },
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const staleTokens: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            staleTokens.push(chunk[i].to as string);
          }
        });
      } catch (err) {
        console.error('[sendPushOnNotificationCreate] Failed to send chunk:', err);
      }
    }

    if (staleTokens.length > 0) {
      await db.collection('users').doc(userId).update({
        pushTokens: FieldValue.arrayRemove(...staleTokens),
      });
    }
  }
);
