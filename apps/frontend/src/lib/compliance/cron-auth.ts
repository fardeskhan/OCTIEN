/**
 * Shared-secret authorization for system/cron-only internal endpoints.
 *
 * Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` on every scheduled
 * invocation when the `CRON_SECRET` environment variable is set on the deployment. This helper
 * verifies exactly that header against the configured secret.
 *
 * Fails CLOSED: when no secret is configured, NOTHING is authorized — the endpoint stays inert
 * rather than open. This is the sole gate for these endpoints (they are excluded from the session
 * middleware), so an ordinary authenticated tenant user — who never possesses CRON_SECRET — cannot
 * reach the protected handler.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null | undefined,
  secret: string | undefined | null,
): boolean {
  if (!secret) return false; // unconfigured -> deny all (fail closed)
  if (!authorizationHeader) return false;

  const expected = `Bearer ${secret}`;
  // Length-check first, then compare every byte without an early exit, so a caller cannot learn the
  // secret one character at a time from response timing.
  if (authorizationHeader.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= authorizationHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
