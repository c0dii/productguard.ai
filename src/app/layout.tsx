import type { Metadata } from 'next';
import '../styles/globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

export const metadata: Metadata = {
  title: 'ProductGuard.ai - AI-Powered Piracy Protection',
  description: 'Protect your digital products from online piracy with automated monitoring and one-click DMCA takedowns.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
