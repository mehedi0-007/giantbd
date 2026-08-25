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
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

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

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';
    const user = (request as any).user;
    const userInfo = user ? ` [User: ${user.name || user.email || user.id}]` : '';

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          const message = `${method} ${originalUrl} ${statusCode} +${duration}ms - ${ip}${userInfo}`;

          if (statusCode >= 500) {
            this.logger.error(message);
          } else if (statusCode >= 400) {
            this.logger.warn(message);
          } else {
            this.logger.log(message);
          }
        },
        error: (error: any) => {
          const duration = Date.now() - startTime;
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;

          const message = `${method} ${originalUrl} ${status} +${duration}ms - ${ip}${userInfo} - Error: ${error.message}`;

          if (status >= 500) {
            this.logger.error(message, error.stack);
          } else {
            this.logger.warn(message);
          }

          return throwError(() => error);
        },
      }),
    );
  }
}
