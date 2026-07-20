import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Setly',
  description: 'How Setly collects, uses, and shares your information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/">
          <Image src="/logo.png" alt="Setly" width={97} height={40} className="h-8 w-auto" priority />
        </Link>
        <Link href="/" className="text-sm text-textSecondary hover:text-textPrimary transition-colors">
          Back to home
        </Link>
      </header>

      <main className="flex-1 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-textPrimary mb-2">Privacy Policy</h1>
          <p className="text-sm text-textTertiary mb-10">Last updated: June 28, 2026</p>

          <div className="space-y-8 text-textSecondary text-[15px] leading-relaxed">
            <p>
              This Privacy Policy explains what information Setly (&quot;we&quot;, &quot;us&quot;) collects when
              you use the app, how we use it, and the choices you have. By using Setly, you agree
              to the practices described here.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Information We Collect</h2>
              <p className="mb-3">
                Account information: your email address, display name, and a unique account
                identifier (user ID) generated when your account is created.
              </p>
              <p className="mb-3">
                Content you create: concert journal entries (artists, venue, date, cost, notes,
                ratings), photos you upload, comments, replies, and likes.
              </p>
              <p className="mb-3">
                Social graph: your friends list, friend requests, and any users you block.
              </p>
              <p className="mb-3">
                Search queries: when you search for an artist or venue while adding an event, that
                query is sent to the Ticketmaster API to return matching results.
              </p>
              <p>
                Reports you submit: content reports and bug reports, including the description you
                provide and basic device/app information (platform and app version) to help us
                investigate.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To operate the app: store your journal entries, sync them across devices, and show your content to friends you&apos;ve connected with.</li>
                <li>To support the friends/social features: friend requests, comments, likes, and blocking.</li>
                <li>To respond to bug reports and content reports you submit.</li>
                <li>To search for event details (artist, venue, date) when you add a new event.</li>
                <li>To show ads in the friends feed, as described below.</li>
              </ul>
              <p className="mt-3">We do not sell your information.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Advertising</h2>
              <p>
                We show ads in the friends feed through Google AdMob. AdMob and its partners may
                use device identifiers (such as your advertising ID) and other data to serve and
                measure ads, including personalized ads where permitted. Where required by law
                (such as under GDPR or CCPA), you&apos;ll be shown a consent prompt to control ad
                personalization the first time you use the app. You can change this choice later,
                or opt out of personalized advertising entirely, through your device&apos;s ad
                settings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">How We Share Your Information</h2>
              <p className="mb-3">
                We use Firebase (a Google service) to authenticate accounts and store app data and
                photos. Google Sign-In is available as an optional way to log in. These providers
                process data on our behalf and under their own privacy terms.
              </p>
              <p className="mb-3">
                We use the Ticketmaster API to search for event details when you&apos;re adding an
                event. We only send your search query (e.g. an artist or venue name) — no personal
                account information is sent to Ticketmaster.
              </p>
              <p>
                Content you choose to share (events, comments, likes) is visible to the friends
                you&apos;ve connected with, subject to any &quot;hide from friends&quot; setting you apply
                to an event.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Your Choices</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Edit your display name at any time in Settings.</li>
                <li>Hide individual events from your friends&apos; feed.</li>
                <li>Block other users, which also ends any existing friendship.</li>
                <li>Report comments, replies, or events that violate our Terms of Use.</li>
                <li>Control ad personalization via the consent prompt or your device&apos;s ad settings, as described under Advertising above.</li>
                <li>Delete your account from Settings → Delete Account. This permanently removes your profile, journal entries, photos, and friend connections. Comments or likes you left on other people&apos;s events may not be immediately removed. This cannot be undone.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Children&apos;s Privacy</h2>
              <p>
                Setly is not directed at children under 13, and we do not knowingly collect
                information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. Continued use of the app after
                changes take effect means you accept the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Contact Us</h2>
              <p>
                Questions about this policy or requests regarding your data can be sent to{' '}
                <a href="mailto:setlyhelp@outlook.com" className="text-accent hover:underline">
                  setlyhelp@outlook.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 bg-surface">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-textTertiary">
          <span>&copy; 2025 Setly. All rights reserved.</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-textSecondary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-textSecondary transition-colors">
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
