import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { QueryProvider } from 'components/providers/query-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telegram Groups - Монгол улсын анхны Telegram бүлгийн удирдлагын платформ',
  description: 'Автомат төлбөрийн систем, гишүүдийн удирдлага, аналитик мэдээлэл - бүгдийг нэг платформд. Telegram бүлгээ орлоготой болгох хамгийн хялбар арга.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='mn'>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
