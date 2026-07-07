export class LedgerHashManifest {
  constructor(
    public readonly algorithm: string,
    public readonly serializationVersion: string,
    public readonly fieldOrderingVersion: string,
    public readonly encoding: string,
    public readonly hash: string
  ) {}

  equals(other: LedgerHashManifest): boolean {
    return this.algorithm === other.algorithm && 
           this.serializationVersion === other.serializationVersion && 
           this.fieldOrderingVersion === other.fieldOrderingVersion && 
           this.encoding === other.encoding && 
           this.hash === other.hash;
  }
}

/**
 * SHARED FINANCIAL KERNEL
 * Represents a cryptographic hash of a Journal's state, including the previous hash.
 * This file is physically frozen and must not be duplicated by any capability.
 */
export class LedgerHash {
  constructor(
    public readonly manifest: LedgerHashManifest,
    public readonly previousHash?: string,
    public readonly generatedAt: string = new Date().toISOString()
  ) {
    if (!manifest.hash || manifest.hash.length < 32) {
      throw new Error('LedgerHash manifest must contain a valid cryptographic string');
    }
  }

  equals(other: LedgerHash): boolean {
    return this.manifest.equals(other.manifest) && 
           this.previousHash === other.previousHash;
  }
}
