import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { finalize, map } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, ip, url } = request;
    const now = Date.now();
    const timestamp = new Date().toISOString();

    Logger.log(`info ${timestamp} ip: ${ip} method: ${method} url: ${url}`);

    return next.handle().pipe(
      map((response: any) => ({
        success: response?.success,
        data: response?.data,
        meta: response?.meta,
        message: response?.message,
      })),
      finalize(() => {
        Logger.log(`Excution time... ${Date.now() - now}ms`);
      }),
    );
  }
}
