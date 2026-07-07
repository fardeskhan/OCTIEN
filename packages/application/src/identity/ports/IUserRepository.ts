import { User } from '../../../../domain/src/identity/aggregates/User';
import { UserId } from '../../../../domain/src/identity/value-objects/UserId';
import { TenantId } from '../../../../shared-kernel/src/domain/value-objects/TenantId';

export interface IUserRepository {
  /**
   * Retrieves a User aggregate by its ID, constrained to the active Tenant.
   * Throws an error if the user is not found or belongs to a different tenant.
   */
  findById(id: UserId, tenantId: TenantId): Promise<User>;

  /**
   * Saves the User aggregate state.
   * This operation MUST be wrapped in a transaction that also commits all 
   * pending domain events to the Outbox.
   */
  save(user: User): Promise<void>;

  /**
   * Checks if an email is already registered within a specific tenant.
   */
  existsByEmail(email: string, tenantId: TenantId): Promise<boolean>;
}
