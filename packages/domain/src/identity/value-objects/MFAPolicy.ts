import { ValueObject } from '@cosmy/shared-kernel';

export interface MFAPolicyProps {
  enforcementLevel: 'OPTIONAL' | 'REQUIRED' | 'ADAPTIVE';
  allowedMethods: ('TOTP' | 'WEBAUTHN' | 'SMS')[];
  requireStepUpForSensitiveActions: boolean;
}

export class MFAPolicy extends ValueObject<MFAPolicyProps> {
  private constructor(props: MFAPolicyProps) {
    super(props);
  }

  public static create(props: MFAPolicyProps): MFAPolicy {
    return new MFAPolicy(props);
  }

  public get enforcementLevel(): string {
    return this.props.enforcementLevel;
  }
}
