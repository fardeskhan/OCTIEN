import type { MetadataRoute } from 'next';
import { branding } from '@/lib/branding';

/**
 * PWA manifest, served at /manifest.webmanifest. All values come from the central branding
 * config so a rebrand / white-label needs no edits here.
 */
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.productName,
    short_name: branding.productName,
    description: branding.metadata.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: branding.themeColor,
    icons: [
      {
        src: branding.logo.icon,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: branding.logo.mark,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
