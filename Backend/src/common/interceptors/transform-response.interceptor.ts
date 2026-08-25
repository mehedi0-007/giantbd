import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    total?: number;
    per_page?: number;
    current_page?: number;
    total_page?: number;
  };
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((payload) => {
        const statusCode = response.statusCode || 200;

        if (payload === null || payload === undefined) {
          return {
            success: true,
            statusCode,
            message: 'Success',
            data: null as any,
          };
        }

        if (typeof payload === 'object' && !Array.isArray(payload)) {
          if ('success' in payload && 'data' in payload && 'statusCode' in payload) {
            return payload;
          }

          const {
            message,
            msg,
            data,
            total,
            per_page,
            current_page,
            total_page,
            ...rest
          } = payload;

          const responseMessage = message || msg || 'Success';

          if (total !== undefined) {
            return {
              success: true,
              statusCode,
              message: responseMessage,
              data: data !== undefined ? data : rest,
              meta: {
                total,
                per_page,
                current_page,
                total_page,
              },
            };
          }

          if (data !== undefined) {
            return {
              success: true,
              statusCode,
              message: responseMessage,
              data,
            };
          }

          if ((message || msg) && Object.keys(rest).length === 0) {
            return {
              success: true,
              statusCode,
              message: responseMessage,
              data: null as any,
            };
          }
        }

        return {
          success: true,
          message: 'Success',
          data: payload,
        };
      }),
    );
  }
}
