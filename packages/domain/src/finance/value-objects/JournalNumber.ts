export class JournalNumber {
  private constructor(public readonly value: string) {}

  public static create(value: string): JournalNumber {
    const trimmed = value.trim().toUpperCase();
    if (!/^JRN-\d{4}-\d+$/.test(trimmed)) {
      throw new Error(`Invalid Journal Number: ${value}. Must match format JRN-YYYY-XXXX`);
    }
    return new JournalNumber(trimmed);
  }

  public equals(other: JournalNumber): boolean {
    return this.value === other.value;
  }
}
