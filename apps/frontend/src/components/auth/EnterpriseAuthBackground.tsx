"use client";

/**
 * EnterpriseAuthBackground — OCTIEN's cinematic authentication environment. A calm, premium
 * "intelligent data" atmosphere built entirely from CSS + SVG (no images, canvas, or libraries):
 * a deep ambient field, a glowing central focus behind the panel, a flowing dotted **data terrain**
 * on the lower flanks with soft wave-crest light traces, a few drifting light points, and a gentle
 * corner vignette. Center-top stays clear so the auth card is always the focus.
 *
 * - Token-driven (var(--primary)/(--foreground)/(--background)) → adapts to light + dark.
 * - Animates ONLY transform + opacity; a small number of nodes; GPU-friendly; deterministic.
 * - `aria-hidden` + non-interactive; never affects layout or focus.
 * - Reduced motion: the app's global reset freezes all animation, leaving a static atmosphere.
 * - Terrain wave-lines + particles are hidden below `sm` for mobile performance.
 */
export function EnterpriseAuthBackground() {
  const dots = "radial-gradient(circle, color-mix(in oklab, var(--primary) 42%, transparent) 1px, transparent 1.7px)";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Ambient field — top wash + a soft central focus behind the panel. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(1100px circle at 50% 26%, color-mix(in oklab, var(--primary) 9%, transparent), transparent 58%)",
            "radial-gradient(1300px circle at 50% 52%, color-mix(in oklab, var(--primary) 7%, transparent), transparent 55%)",
          ].join(","),
        }}
      />

      {/* Flowing dotted data terrain — lower-left flank. */}
      <div
        className="octien-auth-drift absolute inset-y-0 left-0 w-[52%] opacity-70"
        style={{
          backgroundImage: dots,
          backgroundSize: "23px 23px",
          maskImage: "radial-gradient(130% 92% at 0% 100%, #000 4%, transparent 62%)",
          WebkitMaskImage: "radial-gradient(130% 92% at 0% 100%, #000 4%, transparent 62%)",
        }}
      />
      {/* Flowing dotted data terrain — lower-right flank. */}
      <div
        className="octien-auth-drift-2 absolute inset-y-0 right-0 w-[52%] opacity-70"
        style={{
          backgroundImage: dots,
          backgroundSize: "23px 23px",
          maskImage: "radial-gradient(130% 92% at 100% 100%, #000 4%, transparent 62%)",
          WebkitMaskImage: "radial-gradient(130% 92% at 100% 100%, #000 4%, transparent 62%)",
        }}
      />

      {/* Soft wave-crest light traces along the lower flanks (desktop/tablet). */}
      <svg
        className="absolute inset-x-0 bottom-0 hidden h-[62%] w-full text-primary sm:block"
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <g stroke="currentColor" fill="none" strokeLinecap="round">
          <path className="octien-auth-wave" style={{ opacity: 0.22 }} strokeWidth="1.5" d="M-40 300 C 240 210, 380 360, 560 330" />
          <path className="octien-auth-wave" style={{ opacity: 0.16, animationDelay: "1.5s" }} strokeWidth="1.5" d="M-40 400 C 260 320, 430 470, 620 430" />
          <path className="octien-auth-wave" style={{ opacity: 0.22 }} strokeWidth="1.5" d="M1480 300 C 1200 210, 1060 360, 880 330" />
          <path className="octien-auth-wave" style={{ opacity: 0.16, animationDelay: "1.5s" }} strokeWidth="1.5" d="M1480 400 C 1180 320, 1010 470, 820 430" />
        </g>
      </svg>

      {/* Drifting light points (desktop/tablet). */}
      <div className="absolute inset-0 hidden sm:block">
        {[
          ["10%", "66%", "0s"], ["20%", "40%", "5s"], ["16%", "82%", "9s"],
          ["84%", "38%", "3s"], ["80%", "70%", "7s"], ["90%", "56%", "11s"],
          ["50%", "16%", "6s"],
        ].map(([left, top, delay], i) => (
          <span
            key={i}
            className="octien-auth-float absolute size-1 rounded-full bg-primary"
            style={{ left, top, animationDelay: delay, opacity: 0.4 }}
          />
        ))}
      </div>

      {/* Central breathing glow behind the panel. */}
      <div
        className="octien-auth-breathe absolute left-1/2 top-[46%] size-[46rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 13%, transparent), transparent 62%)" }}
      />

      {/* Subtle corner vignette to seat the composition. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 78% 74% at 50% 46%, transparent 58%, color-mix(in oklab, var(--background) 55%, transparent) 100%)" }}
      />

      <style>{`
        @keyframes octien-auth-drift  { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-1.2%, -1%, 0); } }
        @keyframes octien-auth-drift2 { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(1.2%, -1%, 0); } }
        @keyframes octien-auth-breathe{ 0%,100% { opacity: .55; } 50% { opacity: .9; } }
        @keyframes octien-auth-wave   { 0%,100% { opacity: .1; transform: translateX(0); } 50% { opacity: .3; transform: translateX(-1%); } }
        @keyframes octien-auth-float  { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: .55; } 85% { opacity: .55; } 100% { transform: translateY(-52px); opacity: 0; } }
        .octien-auth-drift   { animation: octien-auth-drift 46s ease-in-out infinite; transform-origin: bottom left; }
        .octien-auth-drift-2 { animation: octien-auth-drift2 46s ease-in-out infinite; transform-origin: bottom right; }
        .octien-auth-breathe { animation: octien-auth-breathe 10s ease-in-out infinite; }
        .octien-auth-wave    { animation: octien-auth-wave 12s ease-in-out infinite; }
        .octien-auth-float   { animation: octien-auth-float 19s linear infinite; }
      `}</style>
    </div>
  );
}
