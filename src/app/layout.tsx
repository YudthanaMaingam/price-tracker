// src/app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers' // Import Providers
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Price Tracker App',
  description: 'Track prices of your favorite products!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers> {/* ห่อด้วย Providers */}
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}