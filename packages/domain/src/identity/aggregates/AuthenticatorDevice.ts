import { AggregateRoot } from '@cosmy/shared-kernel';

export interface AuthenticatorDeviceProps {
  userId: string;
  type: 'TOTP' | 'WEBAUTHN' | 'SMS' | 'RECOVERY_CODE';
  credentialId: string;
  publicKey?: string; // For WebAuthn
  secret?: string;    // For TOTP encrypted
  counter: number;
  isActive: boolean;
  lastUsedAt?: Date;
}

export class AuthenticatorDevice extends AggregateRoot<AuthenticatorDeviceProps> {
  private constructor(props: AuthenticatorDeviceProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<AuthenticatorDeviceProps, 'isActive' | 'counter'>): AuthenticatorDevice {
    return new AuthenticatorDevice({
      ...props,
      isActive: true,
      counter: 0,
    });
  }

  public incrementCounter(): void {
    this.props.counter += 1;
    this.props.lastUsedAt = new Date();
    this.incrementVersion();
  }

  public disable(): void {
    this.props.isActive = false;
    this.incrementVersion();
  }
}
