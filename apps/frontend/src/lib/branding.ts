/**
 * Centralized branding configuration for the whole application.
 *
 * This is the single source of truth for the product's public identity. Every user-facing
 * component MUST read its name/logo/metadata from here instead of hardcoding strings — so a
 * future white-label deployment (or a logo change) only touches this file and the referenced
 * assets under `public/branding/`.
 *
 * Product ....... OCTIEN (the commercial ERP)
 * Developer ..... Aeterex (the company that builds OCTIEN)
 *
 * NOTE: business-entity names in tenant data (e.g. "Salam Cola", "COSMY UCO", "COSMY Group")
 * are NOT product branding and are intentionally left untouched — they are customer records.
 */

const VERSION = "1.0.0";
const COPYRIGHT_YEAR = new Date().getFullYear();

export const branding = {
  /** Public product name shown across the UI, titles, exports and emails. */
  productName: "OCTIEN",
  /** One-line product descriptor used for metadata / marketing copy. */
  tagline: "Enterprise Resource Planning & Business Operating System",

  /** The company that develops the product. */
  company: {
    name: "Aeterex",
    /** Attribution string used by the watermark, emails and export footers. */
    poweredBy: "Powered by Aeterex",
    website: "https://aeterex.com",
    supportEmail: "support@aeterex.com",
  },

  /**
   * Logo assets — the single swap point. To change the product logo everywhere, replace these
   * files in `public/branding/` (keeping the same paths). Nothing else needs to change.
   *  - mark:  square icon-only mark (compact spots: sidebar, favicons, avatars)
   *  - full:  horizontal lockup (mark + wordmark) for light surfaces (login, PDF, emails)
   *  - icon:  square app icon used for favicon / PWA / apple-touch
   */
  logo: {
    // Official OCTIEN logo — shown everywhere the in-app brand appears (via <BrandLogo>).
    mark: "/branding/octien-official.svg",
    full: "/branding/octien-official.svg",
    // Favicon / PWA icon is kept as the lightweight square icon (a 2 MB favicon would be wasteful and
    // is downscaled to ~16px by browsers anyway).
    icon: "/branding/octien-icon.svg",
    alt: "OCTIEN",
  },

  /** Aeterex company logo (used by the PoweredByAeterex watermark and email footers). */
  companyLogo: "/branding/aeterex.svg",

  /** Favicon reference (also see app/manifest.ts and the root layout `icons` metadata). */
  favicon: "/branding/octien-icon.svg",

  /** Brand theme color for the browser chrome / PWA (OCTIEN blue). */
  themeColor: "#2563eb",

  /** Full official logo (raster-embedded) — for large brand moments (login splash) only. */
  officialLogo: "/branding/octien-official.svg",

  version: VERSION,
  /** Human-readable version label, e.g. shown in Settings / About. */
  versionLabel: `OCTIEN Version ${VERSION}`,
  copyright: `© ${COPYRIGHT_YEAR} Aeterex. All rights reserved.`,

  /** Values consumed by the root-layout Metadata / SEO / Open Graph / PWA. */
  metadata: {
    title: "OCTIEN",
    titleTemplate: "%s · OCTIEN",
    description:
      "OCTIEN — Enterprise Resource Planning & Business Operating System by Aeterex.",
    applicationName: "OCTIEN",
    ogImage: "/branding/octien-logo.svg",
  },
} as const;

export type Branding = typeof branding;
