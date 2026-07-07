import { RequestContext } from './RequestContext';

export interface Command {
  readonly context: RequestContext;
  readonly idempotencyKey?: string; // Prevents duplicate execution
}

export interface CommandHandler<TCommand extends Command, TResult> {
  handle(command: TCommand): Promise<import('./CommandResult').CommandResult<TResult>>;
}
