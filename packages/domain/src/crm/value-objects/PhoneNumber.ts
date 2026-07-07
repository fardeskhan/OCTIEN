import { ValueObject } from '@cosmy/shared-kernel/src/domain/ValueObject';

export class PhoneNumber extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  public static create(phone: string): PhoneNumber {
    const trimmed = phone.trim();
    // Simplified E.164-ish validation allowing international codes
    const regex = /^\+?[1-9]\d{1,14}$/;

    if (!regex.test(trimmed.replace(/[\s\-\(\)]/g, ''))) {
      throw new Error(`Invalid phone number format: ${phone}. Must conform to standard international length.`);
    }

    return new PhoneNumber(trimmed);
  }

  get value(): string {
    return this.props.value;
  }
}
