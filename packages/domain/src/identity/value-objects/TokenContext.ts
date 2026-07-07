import { ValueObject } from '@cosmy/shared-kernel';

export interface TokenContextProps {
  accessToken: string;
  refreshToken: string;
  issuedAt: Date;
}

export class TokenContext extends ValueObject<TokenContextProps> {
  private constructor(props: TokenContextProps) {
    super(props);
  }

  public static create(props: TokenContextProps): TokenContext {
    return new TokenContext(props);
  }

  public get accessToken(): string {
    return this.props.accessToken;
  }

  public get refreshToken(): string {
    return this.props.refreshToken;
  }
}
