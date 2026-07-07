import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

async function deleteAllDocs(snapshotDocs: { ref: any }[]): Promise<void> {
  await Promise.all(snapshotDocs.map(d => deleteDoc(d.ref)));
}

async function deleteSubcollection(first: string, ...rest: string[]): Promise<void> {
  const snap = await getDocs(collection(db, first, ...rest));
  await deleteAllDocs(snap.docs);
}

// Deletes everything associated with a user ahead of removing their auth account:
//
// 1. Own events (and those events' comments/replies/likes subcollections).
// 2. Comments, replies, and likes this user left on OTHER people's events —
//    done via collectionGroup queries that only touch docs where userId matches
//    (no get() lookups needed, so the client-side security rules pass).
//    Note: subcollections under deleted comments (e.g. other users' replies to
//    the deleted comment) are left in place; they're third-party data and are
//    orphaned rather than deleted.
// 3. Giveaway entries.
// 4. Friend graph (both sides) and pending friend requests.
// 5. User's own notification inbox.
// 6. The user profile doc itself.
export async function deleteAllUserData(userId: string): Promise<void> {
  // ── 1. Own events ────────────────────────────────────────────────────────
  console.log('[deleteAllUserData] step: query own events');
  const ownEvents = await getDocs(query(collection(db, 'events'), where('userId', '==', userId)));
  console.log('[deleteAllUserData] step: own events count', ownEvents.docs.length);
  for (const eventDoc of ownEvents.docs) {
    const eventId = eventDoc.id;
    const commentsSnap = await getDocs(collection(db, 'events', eventId, 'comments'));
    for (const commentDoc of commentsSnap.docs) {
      await deleteSubcollection('events', eventId, 'comments', commentDoc.id, 'replies');
      await deleteSubcollection('events', eventId, 'comments', commentDoc.id, 'likes');
      await deleteDoc(commentDoc.ref);
    }
    await deleteSubcollection('events', eventId, 'likes');
    await deleteDoc(eventDoc.ref);
  }

  // ── 2. Scattered content on others' events ────────────────────────────────
  // Own events are already gone above, so these queries only return content
  // the user left on other people's events.
  console.log('[deleteAllUserData] step: scattered comments/replies/likes/entries');
  const [scatteredComments, scatteredReplies, scatteredLikes, giveawayEntries] = await Promise.all([
    getDocs(query(collectionGroup(db, 'comments'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'replies'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'likes'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'entries'), where('userId', '==', userId))),
  ]);
  await deleteAllDocs([
    ...scatteredComments.docs,
    ...scatteredReplies.docs,
    ...scatteredLikes.docs,
    ...giveawayEntries.docs,
  ]);

  // ── 3. Friend graph ───────────────────────────────────────────────────────
  console.log('[deleteAllUserData] step: friend graph');
  const ownFriends = await getDocs(collection(db, 'users', userId, 'friends'));
  for (const friendDoc of ownFriends.docs) {
    await deleteDoc(doc(db, 'users', friendDoc.id, 'friends', userId)).catch(err => {
      console.log('[deleteAllUserData] reciprocal friend delete failed (continuing):', friendDoc.id, err?.code);
    });
    await deleteDoc(friendDoc.ref);
  }

  const [outgoingRequests, incomingRequests] = await Promise.all([
    getDocs(query(collection(db, 'friendRequests'), where('fromUserId', '==', userId))),
    getDocs(query(collection(db, 'friendRequests'), where('toUserId', '==', userId))),
  ]);
  await deleteAllDocs([...outgoingRequests.docs, ...incomingRequests.docs]);

  await deleteSubcollection('users', userId, 'blockedUsers');

  // ── 4. Notification inbox ─────────────────────────────────────────────────
  console.log('[deleteAllUserData] step: notifications');
  await deleteSubcollection('notifications', userId, 'items');

  // ── 5. User profile ───────────────────────────────────────────────────────
  console.log('[deleteAllUserData] step: user profile');
  await deleteDoc(doc(db, 'users', userId));

  console.log('[deleteAllUserData] done');
}
