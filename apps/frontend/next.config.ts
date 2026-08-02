import type { NextConfig } from "next";
import path from "path";

// Monorepo root (…/COSMY-BOS). This app lives at apps/frontend and its dependencies (next, react,
// prisma, …) are HOISTED to the monorepo root node_modules — i.e. OUTSIDE apps/frontend.
const monorepoRoot = path.resolve(__dirname, "../../");

const nextConfig: NextConfig = {
  // ── Turbopack workspace root ──────────────────────────────────────────────────────────────────
  // Turbopack resolves modules relative to this root and "files outside of the project root are not
  // resolved" (Next 16 docs). Without an explicit root, Turbopack infers it and can land on
  // apps/frontend — which puts the hoisted `next` package (…/COSMY-BOS/node_modules/next) OUTSIDE
  // the root, producing the fatal `get_next_server_import_map → Next.js package not found` panic and
  // an infinite dev refresh loop. Pinning the root to the monorepo root makes resolution
  // deterministic and path-independent (junction vs real path). Node itself already resolves these
  // packages from here — this just tells Turbopack the same truth.
  turbopack: {
    root: monorepoRoot,
  },

  // Build-time (next build) file tracing must use the same monorepo root, otherwise tracing is
  // scoped to apps/frontend and misses hoisted deps — the standalone-output equivalent of the same
  // problem, plus it silences the "inferred workspace root" warning.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
