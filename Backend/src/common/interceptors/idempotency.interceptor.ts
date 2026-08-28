import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';

interface IdempotencyRecord {
  status: 'PENDING' | 'RESOLVED';
  response?: any;
  createdAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = (
      request.headers['x-idempotency-key'] ||
      request.headers['idempotency-key']
    ) as string | undefined;

    if (!key || typeof key !== 'string' || key.trim() === '') {
      return next.handle();
    }

    const cleanKey = `${request.method}:${request.path}:${key.trim()}`;
    const now = Date.now();
    const existing = this.store.get(cleanKey);

    if (existing && existing.createdAt + this.TTL_MS > now) {
      if (existing.status === 'PENDING') {
        throw new ConflictException(
          'A request with this Idempotency-Key is currently being processed. Please wait.',
        );
      }
      if (existing.status === 'RESOLVED' && existing.response !== undefined) {
        return of(existing.response);
      }
    }

    this.store.set(cleanKey, { status: 'PENDING', createdAt: now });

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.store.set(cleanKey, {
            status: 'RESOLVED',
            response: data,
            createdAt: Date.now(),
          });
          this.cleanup();
        },
        error: () => {
          this.store.delete(cleanKey);
        },
      }),
    );
  }

  private cleanup() {
    const now = Date.now();
    if (this.store.size > 2000) {
      for (const [k, v] of this.store.entries()) {
        if (v.createdAt + this.TTL_MS < now) {
          this.store.delete(k);
        }
      }
    }
  }
}
