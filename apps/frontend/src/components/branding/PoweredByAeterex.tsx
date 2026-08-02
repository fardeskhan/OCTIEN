import { branding } from "@/lib/branding";

/**
 * Subtle "Powered by Aeterex" watermark.
 *
 * Injected ONCE from the authenticated root layout — never per page. It is:
 *  - fixed to the bottom-right corner,
 *  - non-interactive (`pointer-events: none`) so it never blocks the UI,
 *  - hidden in print mode (`print:hidden`) so it stays off PDFs/printed reports,
 *  - low-opacity and theme-neutral (a mid-gray mark legible on light and dark).
 *
 * Because it lives in the authenticated layout, it is automatically absent from the login /
 * register pages.
 */
export function PoweredByAeterex() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-3 right-3 z-40 select-none opacity-50 transition-opacity print:hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branding.companyLogo}
        alt={branding.company.poweredBy}
        height={20}
        style={{ height: 20, width: "auto" }}
      />
    </div>
  );
}
