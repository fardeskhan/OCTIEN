import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * JWT Auth Guard
 * Protects the Application Layer by intercepting HTTP requests, resolving JWTs,
 * and building the abstract user claims so the Domain never knows what HTTP is.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Validate JWT (mocked for architectural template)
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return false; // Yields 401 Unauthorized
    }

    // Map JWT claims explicitly into the abstract User interface
    request.user = {
      actorId: 'usr_123',
      businessId: 'bus_abc',
      tenantId: 'tnt_xyz',
      permissions: ['inventory.stock.receive', 'inventory.stock.reserve'],
      locale: 'en-US',
      timezone: 'UTC'
    };
    
    return true;
  }
}
