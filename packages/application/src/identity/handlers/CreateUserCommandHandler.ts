import { IUserRepository } from '../ports/IUserRepository';
import { User } from '../../../../domain/src/identity/aggregates/User';
import { UserId } from '../../../../domain/src/identity/value-objects/UserId';
import { TenantId } from '../../../../shared-kernel/src/domain/value-objects/TenantId';

export class CreateUserCommand {
  constructor(
    public readonly commandId: string,
    public readonly tenantId: string,
    public readonly email: string,
    public readonly requestedByUserId: string
  ) {}
}

export class CreateUserCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  public async execute(command: CreateUserCommand): Promise<void> {
    const tenantId = new TenantId(command.tenantId);
    
    const emailExists = await this.userRepository.existsByEmail(command.email, tenantId);
    if (emailExists) {
      throw new Error(`User with email ${command.email} already exists in this tenant.`);
    }

    // Generate a new ID (in a real app, use IIdGenerator port)
    const newUserId = new UserId(crypto.randomUUID());

    const user = User.create(
      newUserId,
      tenantId,
      command.email
    );

    // Saving will implicitly commit the UserCreatedEvent to the Outbox via the repository
    await this.userRepository.save(user);
  }
}
