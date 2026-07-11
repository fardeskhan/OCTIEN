/**
 * E-Way Bill provider abstraction.
 *
 * Business logic (the server actions) only ever talks to `EWayBillProvider`. Swapping the mock for the
 * real NIC/GSP integration later is a one-line change in `getEWayBillProvider()` — no action or UI edits.
 */

export interface EWayBillRequest {
  invoiceCode: string;
  invoiceAmount: number;
  vehicleNumber?: string;
  transporterName?: string;
}

export interface EWayBillResult {
  ewbNumber: string;
  status: "GENERATED" | "FAILED";
  validFrom: Date | null;
  validUntil: Date | null;
  error?: string;
}

export interface EWayBillCancelResult {
  status: "CANCELLED" | "FAILED";
  error?: string;
}

export interface EWayBillProvider {
  readonly name: string;
  generate(req: EWayBillRequest): Promise<EWayBillResult>;
  cancel(ewbNumber: string, reason: string): Promise<EWayBillCancelResult>;
}

/** Demo provider — deterministic, offline, no external calls. Mirrors the NIC contract. */
class MockEWayBillProvider implements EWayBillProvider {
  readonly name = "mock";
  async generate(req: EWayBillRequest): Promise<EWayBillResult> {
    // 12-digit EWB number, like the real NIC format.
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 15);
    return { ewbNumber: digits, status: "GENERATED", validFrom: now, validUntil };
  }
  async cancel(): Promise<EWayBillCancelResult> {
    return { status: "CANCELLED" };
  }
}

/** Placeholder for the real NIC/GSP integration (credentials + API wiring added later). */
class NicEWayBillProvider implements EWayBillProvider {
  readonly name = "nic";
  async generate(): Promise<EWayBillResult> {
    return { ewbNumber: "", status: "FAILED", validFrom: null, validUntil: null, error: "NIC API not configured yet" };
  }
  async cancel(): Promise<EWayBillCancelResult> {
    return { status: "FAILED", error: "NIC API not configured yet" };
  }
}

/** The single swap point. Set EWAYBILL_PROVIDER=nic once NIC credentials are wired. */
export function getEWayBillProvider(): EWayBillProvider {
  return process.env.EWAYBILL_PROVIDER === "nic" ? new NicEWayBillProvider() : new MockEWayBillProvider();
}
