export enum RoundingMode {
  HALF_EVEN = 'HALF_EVEN',
  HALF_UP = 'HALF_UP',
  UP = 'UP',
  DOWN = 'DOWN'
}

/**
 * Pure Dependency-Free Financial Kernel: RoundingPolicy
 * Pluggable rounding rules allowing tenant-specific or jurisdiction-specific logic.
 */
export class RoundingPolicy {
  constructor(
    public readonly mode: RoundingMode,
    public readonly scale: number,
    public readonly increment?: number
  ) {}

  equals(other: RoundingPolicy): boolean {
    return this.mode === other.mode && 
           this.scale === other.scale && 
           this.increment === other.increment;
  }
}
