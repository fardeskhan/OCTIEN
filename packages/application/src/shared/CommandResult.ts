import { DomainEvent } from 'domain/src/shared/DomainEvent';

export class CommandResult<T> {
  public constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly events: DomainEvent[] = [],
    public readonly warnings: string[] = [],
    public readonly errors: string[] = [],
    public readonly metadata: Record<string, any> = {}
  ) {}

  public static ok<T>(data: T, events: DomainEvent[] = [], metadata?: Record<string, any>): CommandResult<T> {
    return new CommandResult<T>(true, data, events, [], [], metadata);
  }

  public static fail<T>(errors: string[], warnings: string[] = []): CommandResult<T> {
    return new CommandResult<T>(false, undefined, [], warnings, errors);
  }
}
