import { AggregateRoot } from '@cosmy/shared-kernel';
import { FederationPolicy } from '../value-objects/FederationPolicy';

export interface IdentityProviderProps {
  tenantId: string;
  name: string;
  type: 'OAUTH2' | 'OIDC' | 'SAML';
  clientId: string;
  clientSecretHash: string;
  discoveryUrl?: string;
  isActive: boolean;
  federationPolicy: FederationPolicy;
}

export class IdentityProvider extends AggregateRoot<IdentityProviderProps> {
  private constructor(props: IdentityProviderProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<IdentityProviderProps, 'isActive'>): IdentityProvider {
    return new IdentityProvider({
      ...props,
      isActive: true,
    });
  }

  public disable(): void {
    this.props.isActive = false;
    this.incrementVersion();
  }
}
