import { Command } from './Command';
import { CommandResult } from './CommandResult';

/**
 * PipelineBehavior represents middleware that wraps command execution.
 * Before Behaviors: Logging -> Auth -> Validation -> Idempotency
 * After Behaviors: Commit -> Publish Events -> Outbox -> Metrics
 */
export interface PipelineBehavior {
  handle(command: Command, next: () => Promise<CommandResult<any>>): Promise<CommandResult<any>>;
}

export interface CommandBus {
  execute<TCommand extends Command, TResult>(command: TCommand): Promise<CommandResult<TResult>>;
}
