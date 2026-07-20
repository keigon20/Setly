import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — Setly',
  description: 'The terms that govern your use of Setly.',
};

export default function TermsOfUsePage() {
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
          <h1 className="text-3xl font-bold text-textPrimary mb-2">Terms of Use</h1>
          <p className="text-sm text-textTertiary mb-10">Last updated: June 28, 2026</p>

          <div className="space-y-8 text-textSecondary text-[15px] leading-relaxed">
            <p>
              These Terms of Use govern your use of Setly. By creating an account or using the
              app, you agree to these terms.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">The Service</h2>
              <p>
                Setly lets you keep a journal of concerts and music events you&apos;ve attended,
                share them with friends, and interact through comments and likes. Event details
                may be sourced from third-party providers (such as Ticketmaster); we don&apos;t
                guarantee their accuracy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Your Account</h2>
              <p>
                You&apos;re responsible for keeping your login credentials secure and for activity
                that happens under your account. Provide accurate information when creating your
                account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Your Content</h2>
              <p>
                You own the journal entries, photos, comments, and other content you post. By
                posting content, you grant us a license to store and display it within the app to
                you and the friends you&apos;ve connected with, solely to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Post content that is illegal, harassing, abusive, or infringes someone else&apos;s rights.</li>
                <li>Impersonate another person or misrepresent your affiliation with anyone.</li>
                <li>Use the app to spam, scrape, or interfere with other users.</li>
                <li>Attempt to access another user&apos;s account or data without authorization.</li>
              </ul>
              <p className="mt-3">
                You can report comments, replies, or events that violate these terms, and block
                users you don&apos;t want to interact with.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Content Removal &amp; Account Actions</h2>
              <p>
                We may remove content or suspend or terminate accounts that violate these terms.
                You can delete your own account at any time from Settings → Delete Account, which
                permanently removes your data as described in our{' '}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Disclaimer</h2>
              <p>
                Setly is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
                kind. We don&apos;t guarantee the service will be uninterrupted, error-free, or that
                event information sourced from third parties is accurate or current.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, we are not liable for any indirect,
                incidental, or consequential damages arising from your use of the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Changes</h2>
              <p>
                We may update these terms from time to time. Continued use of the app after
                changes take effect means you accept the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-textPrimary mb-3">Contact Us</h2>
              <p>
                Questions about these terms can be sent to{' '}
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
