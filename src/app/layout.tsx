// src/app/layout.tsx
import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import {Providers} from './providers';
import './globals.css';
import {SpeedInsights} from '@vercel/speed-insights/next';
import {Analytics} from '@vercel/analytics/next';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fafafa',
};

export const metadata: Metadata = {
  title: 'GitHub Actions Dashboard — Real-Time CI/CD Monitoring',
  description:
    'Monitor GitHub Actions workflow runs across all your repositories in one real-time dashboard. Smart polling, zero data storage, and instant status updates.',
  openGraph: {
    title: 'GitHub Actions Dashboard — Real-Time CI/CD Monitoring',
    description:
      'One dashboard for every GitHub Actions workflow across every repo. Real-time status, smart polling, and zero server-side data storage.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitHub Actions Dashboard — Real-Time CI/CD Monitoring',
    description:
      'Monitor GitHub Actions workflow runs across all your repositories in one real-time dashboard.',
  },
  keywords: [
    'GitHub Actions',
    'CI/CD dashboard',
    'workflow monitoring',
    'GitHub Actions dashboard',
    'deployment status',
    'CI pipeline monitoring',
    'GitHub workflow runs',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={`${geist.variable} ${geistMono.variable} antialiased`}
    >
      <body className='font-sans bg-canvas text-ink'>
        <SpeedInsights />
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
