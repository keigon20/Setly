import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { AppNotification, AppNotificationType, NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '../types';

const PREFS_KEY = 'notif_prefs';

// Map notification type to the pref key that gates it
const TYPE_TO_PREF: Record<AppNotificationType, keyof NotificationPrefs> = {
  friend_request: 'friendRequest',
  friend_post: 'friendPost',
  event_like: 'eventLike',
  event_comment: 'eventComment',
  comment_reply: 'commentReply',
};

function isNotificationVisible(n: AppNotification, prefs: NotificationPrefs): boolean {
  if (!prefs.all) return false;
  const prefKey = TYPE_TO_PREF[n.type];
  return prefKey ? prefs[prefKey] : true;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  prefs: NotificationPrefs;
  updatePref: (key: keyof NotificationPrefs, value: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  // Load prefs from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(stored => {
      if (stored) {
        setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) });
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAllNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications', user.id, 'items'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        setAllNotifications(snapshot.docs.map(d => ({
          id: d.id,
          type: d.data().type,
          fromUserId: d.data().fromUserId,
          fromDisplayName: d.data().fromDisplayName,
          eventId: d.data().eventId,
          eventTitle: d.data().eventTitle,
          eventOwnerId: d.data().eventOwnerId,
          read: d.data().read ?? false,
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })));
      },
      err => {
        console.warn('[Notifications] Listener error:', err.code);
      }
    );

    return () => unsub();
  }, [isAuthenticated, user]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  };

  const markRead = async (notificationId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', user.id, 'items', notificationId), { read: true });
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = allNotifications.filter(n => !n.read && isNotificationVisible(n, prefs));
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', user.id, 'items', n.id), { read: true });
    });
    await batch.commit();
  };

  const notifications = allNotifications.filter(n => isNotificationVisible(n, prefs));
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, prefs, updatePref }}>
      {children}
    </NotificationsContext.Provider>
  );
}
