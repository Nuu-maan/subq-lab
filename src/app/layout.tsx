import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubQ Lab",
  description: "Try the SubQ Decisions API on real tasks: ticket triage, image checks, a PC build planner and a raw request playground.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-ui">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-solid px-3.5 py-2 text-[13px] font-medium text-on-solid focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        {children}
        <Toaster theme="system" position="bottom-center" closeButton />
      </body>
    </html>
  );
}
