/**
 * The strict versioning definition for the Shared Financial Kernel.
 * Allows Replay manifestations to perfectly identify the serialization and hashing algorithms used.
 */
export const FinancialKernelVersion = Object.freeze({
  major: 1,
  minor: 0,
  patch: 0,
  serializationVersion: 'v1.0-canonical-json',
  hashVersion: 'v1.0-sha256-utf8'
});
