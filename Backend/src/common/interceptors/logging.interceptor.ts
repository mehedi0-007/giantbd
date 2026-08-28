import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) || randomUUID();
    response.setHeader('x-correlation-id', correlationId);

    const { method, originalUrl, ip } = request;
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          const logPayload = {
            correlationId,
            method,
            url: originalUrl,
            status: statusCode,
            durationMs: duration,
            ip,
            userId,
          };

          const logMsg = `[${correlationId}] ${method} ${originalUrl} ${statusCode} +${duration}ms (User: ${userId})`;

          if (statusCode >= 500) {
            this.logger.error(logMsg, JSON.stringify(logPayload));
          } else if (statusCode >= 400) {
            this.logger.warn(logMsg);
          } else {
            this.logger.log(logMsg);
          }
        },
        error: (error: any) => {
          const duration = Date.now() - startTime;
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;

          const logMsg = `[${correlationId}] ${method} ${originalUrl} ${status} +${duration}ms - Error: ${error.message}`;

          if (status >= 500) {
            this.logger.error(logMsg, error.stack);
          } else {
            this.logger.warn(logMsg);
          }
        },
      }),
    );
  }
}
