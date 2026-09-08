import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GiantBD ERP',
  description: 'Enterprise ERP, WMS, Commercial and Production Inventory System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className={`${poppins.className} min-h-full font-sans bg-slate-50 text-slate-900`}>
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
