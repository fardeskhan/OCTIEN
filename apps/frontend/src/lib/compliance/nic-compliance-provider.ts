import { ComplianceProvider, GenerateIRNResponse, GenerateEWayResponse } from "./compliance-provider";
import { NicAuthService } from "./nic-auth-service";

export class NicComplianceProvider implements ComplianceProvider {
  // Simple rate limit token bucket or just delay tracking
  private static lastRequestTime = 0;
  private static MIN_DELAY_MS = 200; // Max 5 RPS globally for this sandbox provider

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastReq = now - NicComplianceProvider.lastRequestTime;
    
    if (timeSinceLastReq < NicComplianceProvider.MIN_DELAY_MS) {
      const waitTime = NicComplianceProvider.MIN_DELAY_MS - timeSinceLastReq;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    NicComplianceProvider.lastRequestTime = Date.now();
  }

  async generateIRN(payload: any): Promise<GenerateIRNResponse> {
    await this.enforceRateLimit();
    
    // Auth logic is strictly separated
    const token = await NicAuthService.getValidToken();

    // Check idempotency (Simulate checking payload for duplicate request signature)
    // If we're passing a specific payload that means 'duplicate_job', we simulate returning existing IRN.
    if (payload.simulateDuplicate) {
      return {
        success: true,
        irn: `IRN-EXISTING-${payload.invoiceId}`,
        signedQrCode: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        pdfBuffer: Buffer.from("Existing IRN PDF Document"),
        message: "Returned existing IRN from provider idempotency cache."
      };
    }

    // Simulate Network Request to NIC
    await new Promise(resolve => setTimeout(resolve, 300));

    // Sandbox error simulations based on payload instructions
    if (payload.simulateTimeout) {
      throw new Error("NIC API Timeout");
    }

    if (payload.simulateFailure) {
      return {
        success: false,
        error: "2150: GSTIN is inactive",
        message: "NIC rejected IRN generation due to business rule validation failure."
      };
    }

    return {
      success: true,
      irn: `IRN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      signedQrCode: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      pdfBuffer: Buffer.from("Mock NIC IRN PDF Document"),
      message: "IRN Generated successfully."
    };
  }

  async generateEWay(payload: any): Promise<GenerateEWayResponse> {
    await this.enforceRateLimit();

    const token = await NicAuthService.getValidToken();

    if (payload.simulateDuplicate) {
      return {
        success: true,
        ewbNumber: `EWAY-EXISTING-${payload.invoiceId}`,
        validUntil: new Date(Date.now() + 86400000 * 3), // 3 days
        pdfBuffer: Buffer.from("Existing EWay PDF Document"),
        message: "Returned existing EWay Bill from provider idempotency cache."
      };
    }

    // Simulate Network Request
    await new Promise(resolve => setTimeout(resolve, 300));

    if (payload.simulateTimeout) {
      throw new Error("NIC API Timeout");
    }

    if (payload.simulateFailure) {
      return {
        success: false,
        error: "312: Distance cannot be calculated",
        message: "NIC rejected EWay Bill generation due to validation failure."
      };
    }

    return {
      success: true,
      ewbNumber: `EWAY-${Date.now()}`,
      validUntil: new Date(Date.now() + 86400000 * 3), // 3 days
      pdfBuffer: Buffer.from("Mock NIC EWay PDF Document"),
      message: "EWay Bill Generated successfully."
    };
  }
  async cancelIRN(irn: string, reason: string): Promise<boolean> { return true; }
  async cancelEWay(ewb: string, reason: string): Promise<boolean> { return true; }

}
