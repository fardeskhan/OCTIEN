import { ValueObject } from '@cosmy/shared-kernel/src/domain/ValueObject';

export class EmailAddress extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  public static create(email: string): EmailAddress {
    const trimmed = email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!regex.test(trimmed)) {
      throw new Error(`Invalid email address format: ${email}`);
    }

    return new EmailAddress(trimmed);
  }

  get value(): string {
    return this.props.value;
  }
}
