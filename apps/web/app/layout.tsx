import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { wix } from '@/_app/fonts';
import '@/_app/styles/globals.css';

export const metadata: Metadata = {
  title: 'Истинный интеллект — аналитический кабинет',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" className={wix.variable}>
      <body>{children}</body>
    </html>
  );
}
