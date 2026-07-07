'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MusicEvent, EventComment } from '@/types';

function StarDisplay({ value, max = 5, label }: { value?: number; max?: number; label?: string }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-textSecondary w-16">{label}</span>}
      <span className="inline-flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={i < Math.round(value) ? 'text-yellow-400' : 'text-border'}>
            ★
          </span>
        ))}
      </span>
      <span className="text-sm text-textTertiary">{value}/{max}</span>
    </div>
  );
}

function EventDetailContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const eventId = searchParams.get('id');

  const [event, setEvent] = useState<MusicEvent | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !eventId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = eventDoc.data();
        const ev: MusicEvent = {
          id: eventDoc.id,
          title: data.title || '',
          artists: data.artists || [],
          venue: data.venue || '',
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          cost: data.cost || 0,
          notes: data.notes || '',
          imageUri: data.imageUri,
          overallRating: data.overallRating ?? undefined,
          soundRating: data.soundRating ?? undefined,
          crowdRating: data.crowdRating ?? undefined,
          setlistRating: data.setlistRating ?? undefined,
          isHidden: data.isHidden || false,
          userId: data.userId,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        };
        setEvent(ev);

        const isOwner = data.userId === user.id;
        if (!isOwner && data.userId) {
          const friendDoc = await getDoc(doc(db, 'users', user.id, 'friends', data.userId));
          setCanComment(friendDoc.exists());
        } else {
          setCanComment(isOwner);
        }

        const commentsSnap = await getDocs(
          query(collection(db, 'events', eventId, 'comments'), orderBy('createdAt', 'asc'))
        );
        const commentList: EventComment[] = commentsSnap.docs.map((cd) => {
          const cd_data = cd.data();
          return {
            id: cd.id,
            userId: cd_data.userId || '',
            displayName: cd_data.displayName || 'Unknown',
            text: cd_data.text || '',
            createdAt: cd_data.createdAt instanceof Timestamp ? cd_data.createdAt.toDate() : new Date(),
          };
        });
        setComments(commentList);
      } catch (err) {
        console.error('Error loading event:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, eventId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim() || !eventId) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'events', eventId, 'comments'), {
        userId: user.id,
        displayName: user.displayName || 'Anonymous',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      setComments((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          userId: user.id,
          displayName: user.displayName || 'Anonymous',
          text: commentText.trim(),
          createdAt: new Date(),
        },
      ]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!eventId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-textSecondary">No event specified.</p>
        <Link href="/journal" className="text-accent hover:underline text-sm mt-4 block">
          ← Back to Journal
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-5xl mb-4">🎵</p>
        <h2 className="text-xl font-semibold text-textPrimary mb-2">Event not found</h2>
        <p className="text-textSecondary mb-6">This event may have been removed.</p>
        <Link href="/journal" className="text-accent hover:underline text-sm">
          ← Back to Journal
        </Link>
      </div>
    );
  }

  const dateStr = event.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/journal"
        className="inline-flex items-center gap-1.5 text-sm text-textSecondary hover:text-textPrimary transition-colors mb-5"
      >
        ← Journal
      </Link>

      {event.imageUri && (
        <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden mb-6 bg-surfaceAlt">
          <Image src={event.imageUri} alt={event.title} fill className="object-cover" unoptimized />
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-textPrimary">{event.title}</h1>
          {event.isHidden && (
            <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-surfaceAlt border border-border text-textTertiary">
              Hidden
            </span>
          )}
        </div>
        {event.artists?.length > 0 && (
          <p className="text-base text-accent mt-1">{event.artists.join(', ')}</p>
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 mb-6 space-y-3">
        <DetailRow icon="📍" label="Venue" value={event.venue} />
        <DetailRow icon="📅" label="Date" value={dateStr} />
        {event.cost > 0 && (
          <DetailRow icon="💰" label="Cost" value={`$${event.cost.toFixed(2)}`} />
        )}
      </div>

      {(event.overallRating || event.soundRating || event.crowdRating || event.setlistRating) && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide">Ratings</h2>
          <StarDisplay value={event.overallRating} label="Overall" />
          <StarDisplay value={event.soundRating} label="Sound" />
          <StarDisplay value={event.crowdRating} label="Crowd" />
          <StarDisplay value={event.setlistRating} label="Setlist" />
        </div>
      )}

      {event.notes && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-2">Notes</h2>
          <p className="text-textPrimary text-sm leading-relaxed whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-4">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-textTertiary text-sm">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold flex-shrink-0">
                  {c.displayName ? c.displayName[0].toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-textPrimary">{c.displayName}</span>
                    <span className="text-xs text-textTertiary">
                      {c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-textSecondary mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {canComment ? (
          <form onSubmit={handleAddComment} className="mt-5 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold flex-shrink-0">
              {user?.displayName ? user.displayName[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-2 rounded-lg bg-surfaceAlt border border-border text-textPrimary placeholder-textTertiary text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-xs text-textTertiary">
            Only the owner and friends can comment on this event.
          </p>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <span className="text-sm text-textSecondary w-14 flex-shrink-0">{label}</span>
      <span className="text-sm text-textPrimary">{value}</span>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
