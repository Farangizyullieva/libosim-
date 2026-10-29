import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, response.statusCode, start, request.user?.id),
        error: (err) =>
          this.log(method, originalUrl, err?.status ?? 500, start, request.user?.id),
      }),
    );
  }

  private log(method: string, url: string, statusCode: number, start: number, userId?: string) {
    const durationMs = Date.now() - start;
    const actor = userId ? ` user=${userId}` : '';
    this.logger.log(`${method} ${url} ${statusCode} ${durationMs}ms${actor}`);
  }
}
