import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { db } from './firebase';
import { AppNotificationType, DEFAULT_NOTIFICATION_PREFS, NotificationPrefs } from '../types';

const PREFS_KEY = 'notif_prefs';

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

export async function scheduleEventReminder(eventId: string, eventTitle: string, eventDate: Date): Promise<void> {
  const stored = await AsyncStorage.getItem(PREFS_KEY);
  const prefs: NotificationPrefs = stored
    ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) }
    : DEFAULT_NOTIFICATION_PREFS;
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
