import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeInitScript } from '@/components/ThemeInitScript';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KAMOL PROJECT — Arxitektura Boshqaruv',
  description: 'Arxitektura loyihalarini boshqarish tizimi',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className={`${playfair.variable} ${manrope.variable} font-sans antialiased`}>
        <AppSettingsProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
