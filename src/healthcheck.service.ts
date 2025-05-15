import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthCheckService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealthStatus(): object {
    return {
      status: 'ok',
      message: 'Application is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
