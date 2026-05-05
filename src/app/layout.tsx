export const runtime = 'edge';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Darwin Engine - Autonomous Generative UX",
  description: "An autonomous, self-evolving digital entity living in the browser. It dynamically writes its own code, mutates its UI, and learns from human interaction.",
  keywords: ["AI", "Generative UX", "Machine Learning", "Three.js", "Web Design", "Autonomous UI"],
  authors: [{ name: "Darwin Engine" }],
  openGraph: {
    title: "Darwin Engine - Autonomous Generative UX",
    description: "Witness an autonomous UI that evolves based on your interactions.",
    url: "https://darwins.pages.dev",
    siteName: "Darwin Engine",
    images: [
      {
        url: "/darwin-page-hero.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Darwin Engine",
    description: "An autonomous, self-evolving Generative UI entity living in the browser.",
    images: ["/darwin-page-hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
