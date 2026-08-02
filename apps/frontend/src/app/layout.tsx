export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { Inter, Geist } from 'next/font/google';
import '../globals.css';
import { Providers } from '@/shared/providers/Providers';
import { cn } from "@/lib/utils";
import { branding } from "@/lib/branding";

const inter = Inter({subsets:['latin'],variable:'--font-sans',display:'swap'});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ),
  applicationName: branding.metadata.applicationName,
  title: {
    default: branding.metadata.title,
    template: branding.metadata.titleTemplate,
  },
  description: branding.metadata.description,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: branding.logo.icon, type: 'image/svg+xml' }],
    shortcut: [branding.favicon],
    apple: [{ url: branding.logo.icon }],
  },
  appleWebApp: {
    capable: true,
    title: branding.productName,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    siteName: branding.productName,
    title: branding.metadata.title,
    description: branding.metadata.description,
    images: [{ url: branding.metadata.ogImage }],
  },
  twitter: {
    card: 'summary',
    title: branding.metadata.title,
    description: branding.metadata.description,
    images: [branding.metadata.ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: branding.themeColor,
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
