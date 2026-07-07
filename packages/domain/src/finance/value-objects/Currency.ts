export class Currency {
  private constructor(public readonly code: string) {}

  public static create(code: string): Currency {
    const upperCode = code.toUpperCase();
    if (!/^[A-Z]{3}$/.test(upperCode)) {
      throw new Error(`Invalid currency code: ${code}. Must be a 3-letter ISO 4217 code.`);
    }
    return new Currency(upperCode);
  }

  public equals(other: Currency): boolean {
    return this.code === other.code;
  }
}
