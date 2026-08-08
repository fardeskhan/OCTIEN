import { cn } from "@/lib/utils";
import { branding } from "@/lib/branding";

type BrandLogoVariant = "mark" | "full";

interface BrandLogoProps {
  /** "mark" = icon only; "full" = icon + product wordmark (default). */
  variant?: BrandLogoVariant;
  /** Height of the logo mark in pixels. Width scales automatically. */
  size?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /**
   * Accessible label for the logo. Defaults to the product name. The wordmark text is
   * theme-aware (inherits `currentColor`) so the same component works on light and dark.
   */
  label?: string;
}

/**
 * Centralized product logo. This is the ONLY place the app renders the OCTIEN logo — every
 * surface (login, sidebar, headers, empty/error states, etc.) consumes this component so the
 * brand can be swapped from one place (`branding.logo` + the assets in `public/branding/`).
 */
export function BrandLogo({
  variant = "full",
  size = 28,
  className,
  label = branding.logo.alt,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branding.logo.mark}
        alt={label}
        height={size}
        // Height-driven; width auto-preserves the logo's aspect ratio (the official mark isn't square).
        style={{ height: size, width: "auto" }}
      />
      {variant === "full" && (
        <span
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: Math.round(size * 0.55) }}
        >
          {branding.productName}
        </span>
      )}
    </span>
  );
}
