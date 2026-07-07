export class OAuth2Gateway {
  constructor(private readonly httpClient: any) {}

  public async exchangeCodeForToken(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<any> {
    console.log(`[OAuth2Gateway] Exchanging code for token. Client: ${clientId}`);
    // HTTP POST to external IdP token endpoint
    return { accessToken: 'ext_mock', idToken: 'ext_id_mock' };
  }

  public async fetchUserInfo(accessToken: string, userInfoEndpoint: string): Promise<any> {
    console.log(`[OAuth2Gateway] Fetching external user profile...`);
    // HTTP GET to UserInfo endpoint
    return { email: 'external@example.com', sub: '12345' };
  }
}
