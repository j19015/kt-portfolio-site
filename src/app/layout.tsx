import { UIProvider, colorModeManager, ColorModeScript, ThemeConfig, Box } from '@yamada-ui/react';

import type { Metadata } from 'next';
import '@/app/styles/fonts.css';
import '@/app/styles/globals.css';
import { Inter } from 'next/font/google';
import { Header } from '@/feature/Header';
import { Footer } from '@/feature/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'kt-portfolio-site',
  description: 'kt-portfolio-site',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja'>
      <body className={inter.className}>
        <ColorModeScript type='cookie' nonce='testing' />
        <UIProvider colorModeManager={{ ...colorModeManager }.cookieStorage}>
          <Header />
          <Box minHeight={'calc(100vh - 64px)'}>{children}</Box>
          <Footer />
        </UIProvider>
      </body>
    </html>
  );
}
