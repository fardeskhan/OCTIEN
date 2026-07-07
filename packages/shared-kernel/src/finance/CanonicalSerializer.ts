import crypto from 'crypto';

/**
 * Pure Dependency-Free Financial Kernel: CanonicalSerializer
 * Centralized serialization logic ensuring identical byte structures during replay.
 */
export class CanonicalSerializer {
  static serialize(payload: any): string {
    // Deterministic canonical JSON serialization
    // Sorts object keys to guarantee byte-for-byte identical output
    return JSON.stringify(payload, (key, value) =>
      value instanceof Object && !Array.isArray(value)
        ? Object.keys(value)
            .sort()
            .reduce((sorted: any, k) => {
              sorted[k] = value[k];
              return sorted;
            }, {})
        : value
    );
  }

  static hash(payload: any, algorithm: string = 'sha256'): string {
    const serialized = this.serialize(payload);
    return crypto.createHash(algorithm).update(serialized, 'utf8').digest('hex');
  }
}
