export class InvalidUnitException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUnitException';
    Object.setPrototypeOf(this, InvalidUnitException.prototype);
  }
}
