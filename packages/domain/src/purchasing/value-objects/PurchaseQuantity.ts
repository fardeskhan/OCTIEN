import { ValueObject } from '@cosmy/shared-kernel/src/domain/ValueObject';

export interface PurchaseQuantityProps {
  value: number;
  unitOfMeasure: string;
}

export class PurchaseQuantity extends ValueObject<PurchaseQuantityProps> {
  private constructor(props: PurchaseQuantityProps) {
    super(props);
  }

  public static create(value: number, unitOfMeasure: string): PurchaseQuantity {
    if (value <= 0) {
      throw new Error('Purchase quantity must be greater than zero.');
    }
    if (!unitOfMeasure || unitOfMeasure.trim() === '') {
      throw new Error('Unit of measure is required.');
    }
    return new PurchaseQuantity({ value, unitOfMeasure: unitOfMeasure.trim().toUpperCase() });
  }

  get value(): number { return this.props.value; }
  get unitOfMeasure(): string { return this.props.unitOfMeasure; }

  public add(other: PurchaseQuantity): PurchaseQuantity {
    if (this.unitOfMeasure !== other.unitOfMeasure) {
      throw new Error('Cannot add quantities with different units of measure.');
    }
    return PurchaseQuantity.create(this.value + other.value, this.unitOfMeasure);
  }

  public subtract(other: PurchaseQuantity): PurchaseQuantity {
    if (this.unitOfMeasure !== other.unitOfMeasure) {
      throw new Error('Cannot subtract quantities with different units of measure.');
    }
    return PurchaseQuantity.create(this.value - other.value, this.unitOfMeasure);
  }

  public isGreaterThanOrEqual(other: PurchaseQuantity): boolean {
    if (this.unitOfMeasure !== other.unitOfMeasure) {
      throw new Error('Cannot compare quantities with different units of measure.');
    }
    return this.value >= other.value;
  }
}
