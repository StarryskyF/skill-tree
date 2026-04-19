import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interceptors/response.interceptor';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (() => {
            const res = exception.getResponse();
            if (typeof res === 'string') return res;
            if (typeof res === 'object' && res !== null && 'message' in res) {
              const msg = (res as Record<string, unknown>).message;
              return Array.isArray(msg) ? msg.join(', ') : String(msg);
            }
            return exception.message;
          })()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message}`,
    );

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
