export interface OAuthTokenState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}

export interface OAuthCoordinator {
  /**
   * Complete OAuth2 PKCE/Auth Code exchange.
   */
  authenticate(adapterId: string, tenantId: string, code: string): Promise<OAuthTokenState>;

  /**
   * Proactively refreshes tokens before they expire.
   */
  refresh(adapterId: string, tenantId: string): Promise<OAuthTokenState>;

  revoke(adapterId: string, tenantId: string): Promise<void>;

  validate(adapterId: string, tenantId: string): Promise<boolean>;

  rotate(adapterId: string, tenantId: string): Promise<OAuthTokenState>;

  health(): Promise<{ status: 'Healthy' | 'Degraded'; refreshFailures: number }>;
}
