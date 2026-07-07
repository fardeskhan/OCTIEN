export abstract class ApplicationException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ApplicationException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedCommandException extends ApplicationException {
  constructor(message: string = "Unauthorized to execute this command.") {
    super(message, 'UNAUTHORIZED');
  }
}

export class ValidationFailedException extends ApplicationException {
  constructor(public readonly errors: string[]) {
    super("Input validation failed.", 'VALIDATION_FAILED');
  }
}

export class BusinessNotFoundException extends ApplicationException {
  constructor(message: string = "The requested business context was not found.") {
    super(message, 'BUSINESS_NOT_FOUND');
  }
}
