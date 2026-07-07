import Image from 'next/image';
import Link from 'next/link';

function JournalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="16" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FriendsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <circle cx="9" cy="8" r="3.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 19.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 6c1.6.2 2.75 1.6 2.75 3.25S17.1 12.3 15.5 12.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 14.2c2.5.4 5 2 5 5.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TicketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path
        d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.75 1.75 0 0 0 0 3.5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a1.75 1.75 0 0 0 0-3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 7v10" strokeLinecap="round" strokeDasharray="1.5 2.5" />
    </svg>
  );
}

const features = [
  {
    Icon: JournalIcon,
    title: 'Journal Your Shows',
    description:
      'Log every concert, festival, and live set. Rate the sound, crowd, and setlist. Keep notes on the moments that mattered.',
  },
  {
    Icon: FriendsIcon,
    title: 'Share With Friends',
    description:
      'Connect with friends who love live music. See what shows they\'ve been to and discover new artists through their experiences.',
  },
  {
    Icon: TicketIcon,
    title: 'Win Tickets',
    description:
      'Enter exclusive giveaways for upcoming shows. Members get first access to ticket drops and special events.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Image src="/logo.png" alt="Setly" width={97} height={40} className="h-8 w-auto" priority />
        <Link
          href="/auth"
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-opacity-90 transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 flex-1">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surfaceAlt border border-border text-textSecondary text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            Now available on Android
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-textPrimary leading-tight">
            Your live music journal,{' '}
            <span className="text-accent">shared with friends.</span>
          </h1>

          <p className="text-lg text-textSecondary max-w-lg mx-auto">
            Setly helps you capture every show, discover what your friends are listening to live, and win tickets to upcoming events.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/auth"
              className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-base hover:bg-opacity-90 transition-colors shadow-lg shadow-accent/20"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-8 py-3 rounded-xl bg-surface border border-border text-textSecondary font-semibold text-base hover:text-textPrimary transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="px-6 py-16 bg-surface border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-textPrimary mb-10">
            Everything you need to track your live music life
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-surfaceAlt border border-border rounded-2xl p-6 flex flex-col gap-4"
              >
                <feature.Icon className="w-7 h-7 text-accent" />
                <h3 className="text-lg font-semibold text-textPrimary">{feature.title}</h3>
                <p className="text-sm text-textSecondary leading-relaxed">{feature.description}</p>
                {/* Screenshot placeholder */}
                <div className="mt-auto border-2 border-dashed border-border rounded-xl h-36 flex items-center justify-center text-textTertiary text-sm font-mono">
                  [ Screenshot ]
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 py-16 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-textPrimary">Ready to start journaling?</h2>
          <p className="text-textSecondary">
            Join thousands of live music fans documenting their concert experiences.
          </p>
          <Link
            href="/auth"
            className="inline-block px-10 py-3 rounded-xl bg-accent text-white font-semibold text-base hover:bg-opacity-90 transition-colors shadow-lg shadow-accent/20"
          >
            Get Started — it&apos;s free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 bg-surface">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-textTertiary">
          <span>&copy; 2025 Setly. All rights reserved.</span>
          <nav className="flex gap-6">
            <a href="#privacy" className="hover:text-textSecondary transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-textSecondary transition-colors">
              Terms of Use
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
