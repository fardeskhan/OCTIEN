export class BusinessId {
  private constructor(public readonly value: string) {}

  public static create(value: string): BusinessId {
    const trimmed = value.trim();
    if (!/^bus_[a-zA-Z0-9]+$/.test(trimmed)) {
      throw new Error(`Invalid Business ID format. Must match standard identifier pattern.`);
    }
    return new BusinessId(trimmed);
  }

  public equals(other: BusinessId): boolean {
    return this.value === other.value;
  }
}
