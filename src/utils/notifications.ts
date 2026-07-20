import { addDoc, collection, doc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from './firebase';
import { AppNotificationType, NotificationPrefs } from '../types';

export interface NotificationPayload {
  type: AppNotificationType;
  fromUserId: string;
  fromDisplayName: string;
  eventId?: string;
  eventTitle?: string;
  eventOwnerId?: string;
  message?: string;
}

export async function writeNotification(toUserId: string, payload: NotificationPayload): Promise<void> {
  const itemsRef = collection(db, 'notifications', toUserId, 'items');

  if (payload.type === 'event_like' && payload.eventId) {
    // Predictable ID deduplicates rapid like/unlike/like cycles
    await setDoc(
      doc(db, 'notifications', toUserId, 'items', `like_${payload.fromUserId}_${payload.eventId}`),
      { ...payload, read: false, createdAt: serverTimestamp() }
    );
  } else {
    await addDoc(itemsRef, { ...payload, read: false, createdAt: serverTimestamp() });
  }
}

export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  prefs: NotificationPrefs
): Promise<void> {
  if (!prefs.all || !prefs.eventReminder) return;

  const trigger = new Date(eventDate);
  trigger.setDate(trigger.getDate() + 1);
  trigger.setHours(10, 0, 0, 0);

  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `reminder_${eventId}`,
    content: {
      title: 'How was it?',
      body: `Log your thoughts and rating for ${eventTitle}`,
      data: { eventId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder_${eventId}`);
  } catch {
    // Notification may not exist — safe to ignore
  }
}

// Registers this device for remote push (friend requests, likes, comments,
// giveaway wins, etc — the notification-tray delivery for everything in
// `notifications/{uid}/items` that isn't a local event reminder). Pushes are
// actually sent by a Cloud Function watching that collection; this just
// makes sure the device's Expo push token is on file for it to find.
export async function registerPushTokenAsync(userId: string): Promise<void> {
  // Push tokens aren't available on simulators/emulators.
  if (!Device.isDevice) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await updateDoc(doc(db, 'users', userId), { pushTokens: arrayUnion(token) });
  } catch (err) {
    console.error('[Notifications] Failed to register push token:', err);
  }
}
