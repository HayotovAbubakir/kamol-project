import type { Metadata, Viewport } from 'next';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeInitScript } from '@/components/ThemeInitScript';
import { ConsoleSilenceScript } from '@/components/ConsoleSilenceScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'KAMOL PROJECT — Arxitektura Boshqaruv',
  description: 'Arxitektura loyihalarini boshqarish tizimi',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <ConsoleSilenceScript />
        <ThemeInitScript />
      </head>
      <body className="font-sans antialiased">
        <AppSettingsProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
