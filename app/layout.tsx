import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s · ProofPay',
    default: 'ProofPay · Get paid the moment the work is done',
  },
  description:
    'Escrow for freelance work on PayPal: the client’s money is held, an AI agent verifies the delivery against agreed criteria, and payment is released automatically.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
