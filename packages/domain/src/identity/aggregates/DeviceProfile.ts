import { AggregateRoot } from '@cosmy/shared-kernel';

export interface DeviceProfileProps {
  userId: string;
  deviceIdHash: string;
  browser: string;
  os: string;
  lastIpAddress: string;
  isTrusted: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export class DeviceProfile extends AggregateRoot<DeviceProfileProps> {
  private constructor(props: DeviceProfileProps, id?: string) {
    super(props, id);
  }

  public static register(props: Omit<DeviceProfileProps, 'isTrusted' | 'firstSeenAt' | 'lastSeenAt'>): DeviceProfile {
    const now = new Date();
    return new DeviceProfile({
      ...props,
      isTrusted: false, // Must be explicitly trusted via MFA
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  public markAsTrusted(): void {
    this.props.isTrusted = true;
    this.incrementVersion();
  }

  public updateLastSeen(ipAddress: string): void {
    this.props.lastIpAddress = ipAddress;
    this.props.lastSeenAt = new Date();
    this.incrementVersion();
  }
}
