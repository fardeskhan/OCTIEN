import { ValueObject } from '../ValueObject';

interface TenantIdProps {
  value: string;
}

export class TenantId extends ValueObject<TenantIdProps> {
  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('TenantId cannot be empty');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
