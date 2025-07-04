import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | ShortLink - URL Shortener",
    default: "ShortLink - Professional URL Shortener",
  },
  description:
    "Shorten URLs, track analytics, and manage your links with ShortLink - the professional URL shortener with advanced features.",
  keywords: [
    "url shortener",
    "link shortener",
    "short link",
    "link analytics",
    "qr code generator",
    "link management",
    "click tracking",
  ],
  authors: [{ name: "ShortLink Team" }],
  creator: "ShortLink",
  publisher: "ShortLink",
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_BASE_URL,
    siteName: "ShortLink",
    title: "ShortLink - Professional URL Shortener",
    description:
      "Shorten URLs, track analytics, and manage your links with advanced features.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ShortLink - URL Shortener",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShortLink - Professional URL Shortener",
    description:
      "Shorten URLs, track analytics, and manage your links with advanced features.",
    images: ["/og-image.png"],
    creator: "@shortlink",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={cn(inter.className, "min-h-screen antialiased")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
