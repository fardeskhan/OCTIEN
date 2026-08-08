"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/branding/BrandLogo";

/**
 * EnterpriseLoginForm — the OCTIEN sign-in panel. Email + password only (the sole configured provider;
 * no social buttons or forgot-password link are shown because neither is backed by the auth layer).
 * Preserves the existing `signIn.email` flow + redirect; auth errors are surfaced inline (accessible,
 * near the form) instead of a toast. Token-driven, WCAG AA, 44px controls.
 */
export function EnterpriseLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await signIn.email({
      email,
      password,
      fetchOptions: {
        onSuccess: () => router.push("/"),
        onError: (ctx) => {
          setError(ctx.error?.message || "Unable to sign in right now. Please try again.");
          setLoading(false);
        },
      },
    });
  };

  const invalid = !!error;

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-md sm:p-8">
      {/* Brand + welcome */}
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-primary/10">
          <BrandLogo variant="mark" size={30} />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your workspace to continue.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && (
          <div
            role="alert"
            id="login-error"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              aria-invalid={invalid}
              aria-describedby={error ? "login-error" : undefined}
              className="h-11 rounded-lg pl-10 text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              aria-invalid={invalid}
              aria-describedby={error ? "login-error" : undefined}
              className="h-11 rounded-lg pl-10 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Sign in */}
        <Button
          type="submit"
          disabled={loading}
          className={cn("h-11 w-full rounded-lg text-sm font-semibold shadow-xs")}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}
