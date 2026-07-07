export class NicAuthService {
  private static cachedToken: string | null = null;
  private static tokenExpiry: number | null = null;
  private static isFetching = false;

  /**
   * For the mock/sandbox RC6.0B phase, this simulates fetching a token with a delay.
   * Real implementation will securely fetch credentials from SSM/ENV and call NIC Auth API.
   */
  public static async getValidToken(): Promise<string> {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    // Await if already fetching to prevent concurrent requests
    while (this.isFetching) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.cachedToken;
      }
    }

    try {
      this.isFetching = true;
      // Simulate NIC API network call delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      this.cachedToken = `NIC-TOKEN-${Date.now()}`;
      // Token valid for 6 hours
      this.tokenExpiry = Date.now() + 6 * 60 * 60 * 1000;
      
      return this.cachedToken;
    } finally {
      this.isFetching = false;
    }
  }

  public static forceRefresh(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;
  }
}
