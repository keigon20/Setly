'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MusicEvent } from '@/types';

function StarDisplay({ value, max = 5 }: { value?: number; max?: number }) {
  if (value === undefined) return null;
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < Math.round(value) ? 'text-yellow-400' : 'text-textTertiary'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarInput({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          className="star-btn"
          onMouseEnter={() => setHovered(i + 1)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i + 1)}
        >
          <span className={(hovered || value) > i ? 'text-yellow-400' : 'text-textTertiary'}>★</span>
        </button>
      ))}
    </span>
  );
}

interface EventFormData {
  title: string;
  artists: string;
  venue: string;
  date: string;
  cost: string;
  notes: string;
  overallRating: number;
  soundRating: number;
  crowdRating: number;
  setlistRating: number;
  isHidden: boolean;
}

const defaultForm: EventFormData = {
  title: '',
  artists: '',
  venue: '',
  date: new Date().toISOString().split('T')[0],
  cost: '',
  notes: '',
  overallRating: 0,
  soundRating: 0,
  crowdRating: 0,
  setlistRating: 0,
  isHidden: false,
};

function AddEventModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof EventFormData) => (val: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.venue.trim() || !form.date) {
      setError('Title, venue, and date are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const artistsList = form.artists
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      await addDoc(collection(db, 'events'), {
        title: form.title.trim(),
        artists: artistsList,
        venue: form.venue.trim(),
        date: Timestamp.fromDate(new Date(form.date + 'T12:00:00')),
        cost: parseFloat(form.cost) || 0,
        notes: form.notes.trim(),
        overallRating: form.overallRating || null,
        soundRating: form.soundRating || null,
        crowdRating: form.crowdRating || null,
        setlistRating: form.setlistRating || null,
        isHidden: form.isHidden,
        userId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-textPrimary">Add Event</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surfaceAlt text-textSecondary transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Event Title *">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="e.g. Taylor Swift – The Eras Tour"
              className="input-base"
              required
            />
          </Field>

          <Field label="Artists (comma-separated)">
            <input
              type="text"
              value={form.artists}
              onChange={(e) => set('artists')(e.target.value)}
              placeholder="e.g. Taylor Swift, Gracie Abrams"
              className="input-base"
            />
          </Field>

          <Field label="Venue *">
            <input
              type="text"
              value={form.venue}
              onChange={(e) => set('venue')(e.target.value)}
              placeholder="e.g. Madison Square Garden"
              className="input-base"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date *">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date')(e.target.value)}
                className="input-base"
                required
              />
            </Field>
            <Field label="Cost ($)">
              <input
                type="number"
                value={form.cost}
                onChange={(e) => set('cost')(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="input-base"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="What was memorable about this show?"
              rows={3}
              className="input-base resize-none"
            />
          </Field>

          <div className="space-y-3">
            <p className="text-xs font-medium text-textSecondary uppercase tracking-wide">Ratings</p>
            <RatingRow label="Overall" value={form.overallRating} onChange={(v) => set('overallRating')(v)} />
            <RatingRow label="Sound" value={form.soundRating} onChange={(v) => set('soundRating')(v)} />
            <RatingRow label="Crowd" value={form.crowdRating} onChange={(v) => set('crowdRating')(v)} />
            <RatingRow label="Setlist" value={form.setlistRating} onChange={(v) => set('setlistRating')(v)} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isHidden}
              onChange={(e) => set('isHidden')(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surfaceAlt accent-accent"
            />
            <span className="text-sm text-textSecondary">Hidden from friends&apos; feed</span>
          </label>

          {error && (
            <p className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surfaceAlt border border-border text-textSecondary text-sm font-medium hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input-base {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          background-color: #222228;
          border: 1px solid #2A2A30;
          color: #F0F0F5;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-base:focus {
          border-color: #4A90E2;
        }
        .input-base::placeholder {
          color: #606070;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-textSecondary mb-1">{label}</label>
      {children}
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-textSecondary w-20">{label}</span>
      <StarInput value={value} onChange={onChange} />
    </div>
  );
}

function EventCard({ event }: { event: MusicEvent }) {
  const dateStr = event.date instanceof Date
    ? event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : String(event.date);

  return (
    <Link
      href={`/journal/event?id=${event.id}`}
      className="block bg-surface border border-border rounded-2xl overflow-hidden hover:border-accent/40 transition-colors group"
    >
      {event.imageUri && (
        <div className="relative h-40 bg-surfaceAlt">
          <Image src={event.imageUri} alt={event.title} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-textPrimary truncate group-hover:text-accent transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-textSecondary truncate">
              {event.artists?.join(', ') || '—'}
            </p>
          </div>
          {event.isHidden && (
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-surfaceAlt border border-border text-textTertiary">
              Hidden
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-textTertiary">
          <span>📍 {event.venue}</span>
          <span>📅 {dateStr}</span>
        </div>

        {event.overallRating !== undefined && event.overallRating > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <StarDisplay value={event.overallRating} />
            <span className="text-xs text-textTertiary">{event.overallRating}/5</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function JournalPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<MusicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'events'),
        where('userId', '==', user.id),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const list: MusicEvent[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
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
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        };
      });
      setEvents(list);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">My Journal</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            {events.length} {events.length === 1 ? 'show' : 'shows'} logged
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🎵</span>
          <h2 className="text-xl font-semibold text-textPrimary mb-2">No shows yet</h2>
          <p className="text-textSecondary mb-6 max-w-sm">
            Start logging your live music experiences. Every show deserves to be remembered.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-opacity-90 transition-colors"
          >
            Add Your First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {showModal && (
        <AddEventModal
          onClose={() => setShowModal(false)}
          onAdded={fetchEvents}
        />
      )}
    </div>
  );
}
