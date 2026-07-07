'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Friend, FriendRequest } from '@/types';

type Tab = 'friends' | 'requests' | 'find';

interface FoundUser {
  id: string;
  displayName: string;
  email: string;
  requestSent?: boolean;
  alreadyFriend?: boolean;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-textPrimary mb-6">Friends</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        {(['friends', 'requests', 'find'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-accent text-white shadow'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            {t === 'find' ? 'Find People' : t === 'requests' ? 'Requests' : 'Friends'}
          </button>
        ))}
      </div>

      {tab === 'friends' && <FriendsTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'find' && <FindPeopleTab />}
    </div>
  );
}

function FriendsTab() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users', user.id, 'friends'));
      const list: Friend[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          displayName: data.displayName || 'Unknown',
          email: data.email || '',
          addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate() : new Date(),
        };
      });
      setFriends(list);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleUnfriend = async (friendId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.id, 'friends', friendId));
      await deleteDoc(doc(db, 'users', friendId, 'friends', user.id));
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err) {
      console.error('Failed to unfriend:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (friends.length === 0) {
    return (
      <EmptyState
        emoji="👥"
        title="No friends yet"
        description="Use the Find People tab to search for friends and send requests."
      />
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={friend.displayName} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">{friend.displayName}</p>
              <p className="text-xs text-textTertiary truncate">{friend.email}</p>
            </div>
          </div>
          <button
            onClick={() => handleUnfriend(friend.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-border text-xs text-textSecondary hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            Unfriend
          </button>
        </div>
      ))}
    </div>
  );
}

function RequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', user.id),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const list: FriendRequest[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fromUserId: data.fromUserId || '',
          fromDisplayName: data.fromDisplayName || 'Unknown',
          fromEmail: data.fromEmail || '',
          toUserId: data.toUserId || '',
          toDisplayName: data.toDisplayName || '',
          toEmail: data.toEmail || '',
          status: data.status,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });
      setRequests(list);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAccept = async (req: FriendRequest) => {
    if (!user) return;
    setProcessing(req.id);
    try {
      // Update request status
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });

      // Add both as friends of each other
      await setDoc(doc(db, 'users', user.id, 'friends', req.fromUserId), {
        displayName: req.fromDisplayName,
        email: req.fromEmail,
        addedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', req.fromUserId, 'friends', user.id), {
        displayName: user.displayName,
        email: user.email,
        addedAt: serverTimestamp(),
      });

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (reqId: string) => {
    setProcessing(reqId);
    try {
      await updateDoc(doc(db, 'friendRequests', reqId), { status: 'declined' });
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (requests.length === 0) {
    return (
      <EmptyState
        emoji="📬"
        title="No pending requests"
        description="When someone sends you a friend request, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={req.fromDisplayName} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">{req.fromDisplayName}</p>
              <p className="text-xs text-textTertiary truncate">{req.fromEmail}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleDecline(req.id)}
              disabled={processing === req.id}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-textSecondary hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={() => handleAccept(req)}
              disabled={processing === req.id}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FindPeopleTab() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !search.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      // Search by displayName (prefix match)
      const nameQ = query(
        collection(db, 'users'),
        where('displayName', '>=', search.trim()),
        where('displayName', '<=', search.trim() + ''),
        limit(15)
      );
      const snap = await getDocs(nameQ);

      // Get existing friends and sent requests to mark them
      const [friendsSnap, sentSnap] = await Promise.all([
        getDocs(collection(db, 'users', user.id, 'friends')),
        getDocs(
          query(
            collection(db, 'friendRequests'),
            where('fromUserId', '==', user.id),
            where('status', '==', 'pending')
          )
        ),
      ]);

      const friendIds = new Set(friendsSnap.docs.map((d) => d.id));
      const sentToIds = new Set(sentSnap.docs.map((d) => d.data().toUserId as string));

      const found: FoundUser[] = snap.docs
        .filter((d) => d.id !== user.id)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            displayName: data.displayName || 'Unknown',
            email: data.email || '',
            alreadyFriend: friendIds.has(d.id),
            requestSent: sentToIds.has(d.id),
          };
        });

      setResults(found);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (found: FoundUser) => {
    if (!user) return;
    setSending(found.id);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.id,
        fromDisplayName: user.displayName,
        fromEmail: user.email,
        toUserId: found.id,
        toDisplayName: found.displayName,
        toEmail: found.email,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setResults((prev) =>
        prev.map((r) => (r.id === found.id ? { ...r, requestSent: true } : r))
      );
    } catch (err) {
      console.error('Failed to send friend request:', err);
    } finally {
      setSending(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border text-textPrimary placeholder-textTertiary text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {results.length === 0 && !loading && search && (
        <p className="text-textTertiary text-sm text-center py-6">No users found for &quot;{search}&quot;</p>
      )}

      <div className="space-y-2">
        {results.map((found) => (
          <div
            key={found.id}
            className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={found.displayName} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-textPrimary truncate">{found.displayName}</p>
                <p className="text-xs text-textTertiary truncate">{found.email}</p>
              </div>
            </div>
            {found.alreadyFriend ? (
              <span className="flex-shrink-0 text-xs text-textTertiary px-3 py-1.5 rounded-lg border border-border">
                Friends
              </span>
            ) : found.requestSent ? (
              <span className="flex-shrink-0 text-xs text-textSecondary px-3 py-1.5 rounded-lg border border-border">
                Requested
              </span>
            ) : (
              <button
                onClick={() => handleAddFriend(found)}
                disabled={sending === found.id}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {sending === found.id ? '…' : 'Add Friend'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold flex-shrink-0">
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-16">
      <span className="text-4xl mb-3 block">{emoji}</span>
      <h3 className="text-lg font-semibold text-textPrimary mb-1">{title}</h3>
      <p className="text-sm text-textSecondary max-w-xs mx-auto">{description}</p>
    </div>
  );
}
