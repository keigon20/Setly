'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const q = query(collection(db, 'events'), where('userId', '==', user.id));
        const snap = await getCountFromServer(q);
        setEventCount(snap.data().count);
      } catch (err) {
        console.error('Failed to fetch event count:', err);
        setEventCount(null);
      } finally {
        setLoadingCount(false);
      }
    };
    fetchCount();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  if (!user) return null;

  const joinedStr = user.createdAt
    ? user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-textPrimary mb-6">Profile</h1>

      {/* Profile card */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName}
              width={72}
              height={72}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
              {user.displayName ? user.displayName[0].toUpperCase() : '?'}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-textPrimary truncate">{user.displayName || 'No name'}</h2>
            <p className="text-sm text-textSecondary truncate">{user.email}</p>
            {joinedStr && (
              <p className="text-xs text-textTertiary mt-1">Member since {joinedStr}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            icon="🎵"
            label="Shows Logged"
            value={loadingCount ? '…' : eventCount !== null ? String(eventCount) : '—'}
          />
        </div>
      </div>

      {/* Account info */}
      <div className="bg-surface border border-border rounded-2xl divide-y divide-border mb-4">
        <InfoRow label="Display Name" value={user.displayName || '—'} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="User ID" value={user.id} monospace />
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full px-4 py-3 rounded-xl bg-surface border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 bg-surfaceAlt border border-border rounded-xl px-4 py-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-textPrimary">{value}</p>
        <p className="text-xs text-textSecondary">{label}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3">
      <span className="text-sm text-textSecondary flex-shrink-0">{label}</span>
      <span
        className={`text-sm text-textPrimary truncate text-right ${monospace ? 'font-mono text-xs text-textTertiary' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
