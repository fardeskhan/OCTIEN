import { AggregateRoot } from '@cosmy/shared-kernel';
import { TokenContext } from '../value-objects/TokenContext';

export interface SessionProps {
  userId: string;
  tenantId: string;
  tokenContext: TokenContext;
  userAgent: string;
  ipAddress: string;
  isValid: boolean;
  expiresAt: Date;
}

export class Session extends AggregateRoot<SessionProps> {
  private constructor(props: SessionProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<SessionProps, 'isValid'>): Session {
    return new Session({
      ...props,
      isValid: true,
    });
  }

  public rotateToken(newTokenContext: TokenContext, newExpiry: Date): void {
    if (!this.props.isValid) throw new Error('Cannot rotate token on invalid session');
    
    this.props.tokenContext = newTokenContext;
    this.props.expiresAt = newExpiry;
    this.incrementVersion();
  }

  public invalidate(): void {
    this.props.isValid = false;
    this.incrementVersion();
  }
}
