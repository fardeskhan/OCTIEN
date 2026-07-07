import { AggregateRoot } from '@cosmy/shared-kernel';

export interface ImpersonationSessionProps {
  actorUserId: string;
  targetUserId: string;
  tenantId: string;
  reason: string;
  delegationRuleId?: string;
  startedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export class ImpersonationSession extends AggregateRoot<ImpersonationSessionProps> {
  private constructor(props: ImpersonationSessionProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<ImpersonationSessionProps, 'isActive' | 'startedAt'>): ImpersonationSession {
    return new ImpersonationSession({
      ...props,
      startedAt: new Date(),
      isActive: true,
    });
  }

  public terminate(): void {
    this.props.isActive = false;
    this.incrementVersion();
  }
}
