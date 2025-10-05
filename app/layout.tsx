import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Motivate",
  description: "Real inspiration at will.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen pb-24">{children}</main>
      </body>
    </html>
  );
}
