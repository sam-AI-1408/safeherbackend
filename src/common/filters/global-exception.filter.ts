import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected error occurred. Please try again later.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || res;
        errorName = (res as any).error || exception.name;
      } else {
        message = res;
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[TraceId: ${traceId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      // Ensure raw database errors or stack traces are never leaked
      message = 'A server error occurred. Please verify service connectivity.';
    }

    // Log the error securely with traceId
    this.logger.warn(
      `[TraceId: ${traceId}] ${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(
        message,
      )}`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorName,
      message,
      traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
