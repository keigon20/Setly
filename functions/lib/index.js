"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicConcerts = exports.sendPushOnNotificationCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const expo_server_sdk_1 = require("expo-server-sdk");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const expo = new expo_server_sdk_1.Expo();
const DEFAULT_NOTIFICATION_PREFS = {
    all: true,
    friendRequest: true,
    friendPost: true,
    eventLike: true,
    eventComment: true,
    commentReply: true,
    eventReminder: true,
};
const TYPE_TO_PREF = {
    friend_request: 'friendRequest',
    friend_post: 'friendPost',
    event_like: 'eventLike',
    event_comment: 'eventComment',
    comment_reply: 'commentReply',
};
const TYPE_TO_TITLE = {
    friend_request: 'Friend Request',
    friend_post: 'New Post',
    event_like: 'New Like',
    event_comment: 'New Comment',
    comment_reply: 'New Reply',
    content_under_review: 'Setly',
    report_outcome: 'Setly',
    new_report: 'Setly',
};
// Mirrors notificationBody() in src/screens/NotificationsScreen.tsx — keep
// the two in sync; this is the same display text used in-app.
function notificationBody(n) {
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
        default:
            return n.message ?? '';
    }
}
function isPushAllowed(type, prefs) {
    if (!prefs.all)
        return false;
    const prefKey = TYPE_TO_PREF[type];
    return prefKey ? prefs[prefKey] : true;
}
exports.sendPushOnNotificationCreate = (0, firestore_1.onDocumentCreated)('notifications/{userId}/items/{itemId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const userId = event.params.userId;
    const notification = snap.data();
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists)
        return;
    const userData = userSnap.data() || {};
    const pushTokens = userData.pushTokens || [];
    if (pushTokens.length === 0)
        return;
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(userData.notificationPrefs || {}) };
    if (!isPushAllowed(notification.type, prefs))
        return;
    const validTokens = pushTokens.filter((token) => expo_server_sdk_1.Expo.isExpoPushToken(token));
    if (validTokens.length === 0)
        return;
    const messages = validTokens.map((token) => ({
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
    const staleTokens = [];
    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            tickets.forEach((ticket, i) => {
                if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                    staleTokens.push(chunk[i].to);
                }
            });
        }
        catch (err) {
            console.error('[sendPushOnNotificationCreate] Failed to send chunk:', err);
        }
    }
    if (staleTokens.length > 0) {
        await db.collection('users').doc(userId).update({
            pushTokens: firestore_2.FieldValue.arrayRemove(...staleTokens),
        });
    }
});
// ---------------------------------------------------------------------------
// Public, read-only feed of ONE user's concerts for their personal website.
// Only events that aren't hidden are returned, with a whitelist of fields
// (no cost, no social data). The uid comes from the PORTFOLIO_UID param
// (set in functions/.env or prompted on deploy).
// ---------------------------------------------------------------------------
const PORTFOLIO_UID = (0, params_1.defineString)('PORTFOLIO_UID');
const asNumber = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asHttpsUrl = (v) => (typeof v === 'string' && v.startsWith('https://') ? v : null);
exports.publicConcerts = (0, https_1.onRequest)({ cors: true, maxInstances: 2, memory: '256MiB' }, async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const uid = PORTFOLIO_UID.value();
    if (!uid) {
        res.status(500).json({ error: 'PORTFOLIO_UID is not configured' });
        return;
    }
    try {
        const snap = await db.collection('events').where('userId', '==', uid).get();
        const concerts = snap.docs
            .map((doc) => ({ id: doc.id, data: doc.data() }))
            // Missing isHidden means visible, matching the app's own handling.
            .filter(({ data }) => data.isHidden !== true)
            .map(({ id, data }) => ({
            id,
            title: typeof data.title === 'string' ? data.title : '',
            artists: Array.isArray(data.artists) ? data.artists.filter((a) => typeof a === 'string') : [],
            venue: typeof data.venue === 'string' ? data.venue : '',
            festivalName: typeof data.festivalName === 'string' ? data.festivalName : null,
            date: data.date?.toDate?.().toISOString() ?? null,
            notes: typeof data.notes === 'string' ? data.notes : '',
            imageUrl: asHttpsUrl(data.imageUri),
            overallRating: asNumber(data.overallRating),
            soundRating: asNumber(data.soundRating),
            crowdRating: asNumber(data.crowdRating),
            setlistRating: asNumber(data.setlistRating),
        }))
            .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        res.json({ concerts });
    }
    catch (err) {
        console.error('[publicConcerts] Failed to load concerts:', err);
        res.status(500).json({ error: 'Could not load concerts' });
    }
});
//# sourceMappingURL=index.js.map