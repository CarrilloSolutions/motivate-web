// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import RandomBackgroundVideo from '@/components/RandomBackgroundVideo';

export const metadata: Metadata = {
  title: 'Motivate',
  description: 'Real inspiration at will.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let sources: string[] = [];
  try {
    const dir = path.join(process.cwd(), 'public', 'bg');
    sources = fs
      .readdirSync(dir)
      .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
      .map((f) => `/bg/${f}`);
  } catch {}

  return (
    <html lang="en">
      <body className="bg-black text-white">
        {/* Background layer */}
        <RandomBackgroundVideo sources={sources} poster="/bg/fallback.jpg" />

        {/* Foreground content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
