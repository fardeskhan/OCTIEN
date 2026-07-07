
import * as crypto from "crypto";

export class CorrelationService {
  /**
   * Generates a unique correlation ID for a business transaction workflow.
   * This should only be generated ONCE at the origin of a workflow.
   */
  static generate(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `CORR-${timestamp}-${random}`;
  }
}

