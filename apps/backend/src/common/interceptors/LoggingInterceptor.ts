import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Pipeline Observability
 * Automatically records Request ID, Correlation ID, Actor, and request duration for every endpoint.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const correlationId = headers['x-correlation-id'] || 'unknown';
    const actorId = request.user?.actorId || 'anonymous';
    
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (val) => {
          console.log(`[HTTP SUCCESS] ${method} ${url} | Actor: ${actorId} | Corr: ${correlationId} | Duration: ${Date.now() - now}ms`);
        },
        error: (err) => {
          console.error(`[HTTP ERROR] ${method} ${url} | Actor: ${actorId} | Corr: ${correlationId} | Duration: ${Date.now() - now}ms | Msg: ${err.message}`);
        }
      })
    );
  }
}
