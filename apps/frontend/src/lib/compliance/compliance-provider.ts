export interface GenerateIRNResponse {
  success: boolean;
  irn?: string;
  ackNumber?: string;
  ackDate?: Date;
  signedQrCode?: string;
  irnPdfUrl?: string;
  pdfBuffer?: Buffer;
  message?: string; // e.g. mock PDF download URL or base64
  error?: string;
}

export interface GenerateEWayResponse {
  success: boolean;
  ewbNumber?: string;
  validUntil?: Date;
  ewayPdfUrl?: string;
  pdfBuffer?: Buffer;
  message?: string;
  error?: string;
}

export interface ComplianceProvider {
  generateIRN(invoiceData: any): Promise<GenerateIRNResponse>;
  cancelIRN(irn: string, reason: string): Promise<boolean>;
  generateEWay(ewayData: any): Promise<GenerateEWayResponse>;
  cancelEWay(ewbNumber: string, reason: string): Promise<boolean>;
}

/**
 * Mock provider for RC6.0A to allow testing flows without NIC dependency.
 */
export class MockComplianceProvider implements ComplianceProvider {
  async generateIRN(invoiceData: any): Promise<GenerateIRNResponse> {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    // For testing failure flows, we can trigger failure if reference contains "FAIL"
    if (invoiceData.reference?.includes("FAIL-IRN")) {
      return { success: false, error: "Mock NIC Error: Invalid HSN Code" };
    }

    return {
      success: true,
      irn: `IRN-MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ackNumber: `ACK-${Math.floor(Math.random() * 100000)}`,
      ackDate: new Date(),
      signedQrCode: "MOCK_QR_CODE_DATA",
      irnPdfUrl: "mock://irn-pdf"
    };
  }

  async cancelIRN(irn: string, reason: string): Promise<boolean> {
    await new Promise(r => setTimeout(r, 300));
    return true;
  }

  async generateEWay(ewayData: any): Promise<GenerateEWayResponse> {
    await new Promise(r => setTimeout(r, 500));

    if (ewayData.reference?.includes("FAIL-EWAY")) {
      return { success: false, error: "Mock NIC Error: Invalid Vehicle Number" };
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 2); // Valid for 2 days

    return {
      success: true,
      ewbNumber: `EWB-${Math.floor(Math.random() * 1000000000)}`,
      validUntil,
      ewayPdfUrl: "mock://eway-pdf"
    };
  }

  async cancelEWay(ewbNumber: string, reason: string): Promise<boolean> {
    await new Promise(r => setTimeout(r, 300));
    return true;
  }
}
