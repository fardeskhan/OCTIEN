export class AccountCode {
  private constructor(public readonly value: string) {}

  public static create(value: string): AccountCode {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`Invalid Account Code: ${value}. Must be strictly numeric.`);
    }
    if (trimmed.length < 3 || trimmed.length > 10) {
      throw new Error(`Invalid Account Code: ${value}. Must be between 3 and 10 digits.`);
    }
    return new AccountCode(trimmed);
  }

  public equals(other: AccountCode): boolean {
    return this.value === other.value;
  }
}
