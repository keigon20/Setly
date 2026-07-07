'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Giveaway } from '@/types';

interface GiveawayWithEntry extends Giveaway {
  entered: boolean;
}

export default function GiveawaysPage() {
  const { user } = useAuth();
  const [giveaways, setGiveaways] = useState<GiveawayWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGiveaway, setSelectedGiveaway] = useState<GiveawayWithEntry | null>(null);

  const fetchGiveaways = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'giveaways'), where('active', '==', true));
      const snap = await getDocs(q);

      const list: GiveawayWithEntry[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const entryDoc = await getDoc(
            doc(db, 'giveaways', d.id, 'entries', user.id)
          );
          return {
            id: d.id,
            eventTitle: data.eventTitle || '',
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
            location: data.location || '',
            ticketType: data.ticketType || '',
            deadline: data.deadline instanceof Timestamp ? data.deadline.toDate() : new Date(data.deadline),
            terms: data.terms || '',
            active: data.active,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            createdBy: data.createdBy || '',
            entered: entryDoc.exists(),
          };
        })
      );

      // Sort by deadline ascending
      list.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
      setGiveaways(list);
    } catch (err) {
      console.error('Failed to fetch giveaways:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiveaways();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleEntered = (giveawayId: string) => {
    setGiveaways((prev) =>
      prev.map((g) => (g.id === giveawayId ? { ...g, entered: true } : g))
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary">Giveaways</h1>
        <p className="text-sm text-textSecondary mt-0.5">Enter for a chance to win tickets to upcoming shows</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : giveaways.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl mb-4 block">🎟️</span>
          <h2 className="text-xl font-semibold text-textPrimary mb-2">No active giveaways</h2>
          <p className="text-textSecondary max-w-sm mx-auto">
            Check back soon — new ticket giveaways are added regularly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {giveaways.map((g) => (
            <GiveawayCard
              key={g.id}
              giveaway={g}
              onOpenModal={() => setSelectedGiveaway(g)}
            />
          ))}
        </div>
      )}

      {selectedGiveaway && (
        <EnterModal
          giveaway={selectedGiveaway}
          onClose={() => setSelectedGiveaway(null)}
          onEntered={() => {
            handleEntered(selectedGiveaway.id);
            setSelectedGiveaway(null);
          }}
        />
      )}
    </div>
  );
}

function GiveawayCard({
  giveaway,
  onOpenModal,
}: {
  giveaway: GiveawayWithEntry;
  onOpenModal: () => void;
}) {
  const deadlineStr = giveaway.deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const eventDateStr = giveaway.date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isExpired = giveaway.deadline < new Date();

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-textPrimary">{giveaway.eventTitle}</h3>
          {giveaway.entered && (
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
              Entered ✓
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1.5 text-sm">
          <p className="text-textSecondary flex gap-2">
            <span>📍</span> {giveaway.location}
          </p>
          <p className="text-textSecondary flex gap-2">
            <span>📅</span> {eventDateStr}
          </p>
          <p className="text-textSecondary flex gap-2">
            <span>🎟️</span> {giveaway.ticketType}
          </p>
          <p className={`flex gap-2 ${isExpired ? 'text-destructive' : 'text-textTertiary'}`}>
            <span>⏰</span> Deadline: {deadlineStr}
          </p>
        </div>
      </div>

      {giveaway.entered ? (
        <div className="w-full py-2.5 rounded-xl bg-surface border border-border text-textTertiary text-sm text-center font-medium">
          Already Entered ✓
        </div>
      ) : isExpired ? (
        <div className="w-full py-2.5 rounded-xl bg-surface border border-border text-destructive text-sm text-center font-medium">
          Deadline Passed
        </div>
      ) : (
        <button
          onClick={onOpenModal}
          className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-opacity-90 transition-colors"
        >
          Enter Giveaway
        </button>
      )}
    </div>
  );
}

function EnterModal({
  giveaway,
  onClose,
  onEntered,
}: {
  giveaway: GiveawayWithEntry;
  onClose: () => void;
  onEntered: () => void;
}) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnter = async () => {
    if (!user) return;
    setAccepting(true);
    setError(null);
    try {
      await setDoc(doc(db, 'giveaways', giveaway.id, 'entries', user.id), {
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        enteredAt: serverTimestamp(),
      });
      onEntered();
    } catch (err: any) {
      console.error('Failed to enter giveaway:', err);
      setError('Failed to enter giveaway. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-textPrimary">Enter Giveaway</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surfaceAlt text-textSecondary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-base font-semibold text-textPrimary">{giveaway.eventTitle}</p>
            <p className="text-sm text-textSecondary mt-1">
              {giveaway.ticketType} · {giveaway.location}
            </p>
          </div>

          {giveaway.terms && (
            <div className="bg-surfaceAlt border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-textSecondary uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
              <p className="text-sm text-textSecondary leading-relaxed">{giveaway.terms}</p>
            </div>
          )}

          {error && (
            <p className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surfaceAlt border border-border text-textSecondary text-sm font-medium hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnter}
              disabled={accepting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entering…
                </span>
              ) : (
                'Accept & Enter'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
