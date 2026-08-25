import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, any>;
        message = resObj.message || exception.message;
        error = resObj.error || exception.name;
      } else {
        message = exceptionResponse || exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          const target = exception.meta?.target;
          const fields = Array.isArray(target) ? target.join(', ') : String(target || 'field');
          message = `Unique constraint violation: record with this ${fields} already exists`;
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = (exception.meta?.cause as string) || 'Record not found or already deleted';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          const field = exception.meta?.field_name || 'referenced record';
          message = `Foreign key constraint failed on: ${field}`;
          break;
        }
        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The relation change violates required constraints';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          error = 'Database Error';
          message = `Database query failed (code: ${exception.code})`;
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Invalid data provided for database operation';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    // Format response envelope
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
