import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationException } from 'application/src/shared/ApplicationException';

/**
 * Global Exception Filter
 * Guarantees a standard JSON contract response across the entire platform,
 * intercepting any ApplicationExceptions seamlessly.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof ApplicationException) {
      status = exception.code === 'UNAUTHORIZED' ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      code = 'HTTP_ERROR';
    }

    response.status(status).json({
      success: false,
      error: message,
      code,
      traceId: request.headers['x-trace-id'] || 'unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
