import { RoundingPolicy } from './RoundingPolicy';

export enum OverflowBehavior {
  THROW = 'THROW',
  SATURATE = 'SATURATE'
}

/**
 * Pure Dependency-Free Financial Kernel: DecimalContext
 * Defines strict bounds to prevent diverse math rules spreading across capabilities.
 */
export class DecimalContext {
  constructor(
    public readonly precision: number,
    public readonly scale: number,
    public readonly roundingPolicy: RoundingPolicy,
    public readonly overflowBehavior: OverflowBehavior
  ) {}

  equals(other: DecimalContext): boolean {
    return this.precision === other.precision && 
           this.scale === other.scale && 
           this.overflowBehavior === other.overflowBehavior && 
           this.roundingPolicy.equals(other.roundingPolicy);
  }
}
