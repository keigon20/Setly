'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/journal', label: 'Journal', icon: '📓' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/giveaways', label: 'Giveaways', icon: '🎟️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-30
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border flex items-center gap-2">
          <Image src="/logo.png" alt="Setly" width={97} height={40} className="h-8 w-auto" priority />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-textSecondary hover:bg-surfaceAlt hover:text-textPrimary'}
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName}
                width={36}
                height={36}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm">
                {user.displayName ? user.displayName[0].toUpperCase() : '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-textPrimary truncate">{user.displayName}</p>
              <p className="text-xs text-textTertiary truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg bg-surfaceAlt border border-border text-textSecondary text-xs font-medium hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surfaceAlt transition-colors text-textSecondary"
            aria-label="Open menu"
          >
            <HamburgerIcon />
          </button>
          <Image src="/logo.png" alt="Setly" width={97} height={40} className="h-7 w-auto" priority />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
