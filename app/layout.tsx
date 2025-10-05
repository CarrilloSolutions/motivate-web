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
  // Auto-scan /public/bg for video files
  let sources: string[] = [];
  try {
    const dir = path.join(process.cwd(), 'public', 'bg');
    sources = fs
      .readdirSync(dir)
      .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
      .map((f) => `/bg/${f}`);
  } catch {
    sources = [];
  }

  return (
    <html lang="en">
      <body>
        <div className="relative min-h-screen">
          <RandomBackgroundVideo sources={sources} poster="/bg/fallback.jpg" />
          {children}
        </div>
      </body>
    </html>
  );
}
