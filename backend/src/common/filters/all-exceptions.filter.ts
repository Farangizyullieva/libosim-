import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorNotifierService } from '../error-notifier/error-notifier.service';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly errorNotifier: ErrorNotifierService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let debug: { name: string; detail: string } | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as any).message ?? exception.message);
    } else {
      // Log full internal detail server-side always.
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
      this.errorNotifier.report(exception, `${request.method} ${request.originalUrl}`);

      // Outside production, also surface the real error name/message in the
      // response itself — this is what actually let us diagnose this class
      // of bug when there was no access to the server terminal. Never do
      // this in production (could leak internals to end users).
      if (process.env.NODE_ENV !== 'production') {
        const err = exception as {
          name?: string;
          message?: string;
          code?: string;
        };
        debug = {
          name: err?.code ? `${err.name} (${err.code})` : err?.name ?? 'UnknownError',
          detail: err?.message ?? String(exception),
        };
      }
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      data: null,
      ...(debug ? { debug } : {}),
    });
  }
}
