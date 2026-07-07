export const dynamic = 'force-dynamic';
// @ts-nocheck
import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import '../globals.css';
import { Providers } from '@/shared/providers/Providers';
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans',display:'swap'});

export const metadata: Metadata = {
  title: 'COSMY ERP',
  description: 'Enterprise Resource Planning & Business Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
