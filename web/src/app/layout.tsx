import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Setly — Your Live Music Journal',
  description: 'Journal your live music experiences and share them with friends.',
  icons: {
    icon: '/favicon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-textPrimary min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
