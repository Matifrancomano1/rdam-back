import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'TOKEN_INVALID',
  403: 'INSUFFICIENT_PERMISSIONS',
  404: 'RESOURCE_NOT_FOUND',
  409: 'DUPLICATE_ENTRY',
  422: 'INVALID_STATE_TRANSITION',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse.message || message;
      code = STATUS_CODE_MAP[status] || 'ERROR';
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message: Array.isArray(message) ? message.join(', ') : message,
        details: null,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
