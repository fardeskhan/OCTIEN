export class VoucherNumber {
  constructor(
    public readonly series: string,
    public readonly year: number,
    public readonly sequence: number,
    public readonly displayValue: string
  ) {}

  equals(other: VoucherNumber): boolean {
    return this.series === other.series && 
           this.year === other.year && 
           this.sequence === other.sequence;
  }
}
