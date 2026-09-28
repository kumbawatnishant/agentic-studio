import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ludo Master - Real-time Multiplayer Ludo',
  description: 'Play classic Ludo online with friends. Real-time multiplayer, beautiful graphics, free to play.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-ludo-surface-950 text-ludo-surface-50 antialiased">
        {children}
      </body>
    </html>
  );
}