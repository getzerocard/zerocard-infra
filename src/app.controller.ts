import { Controller, Get, Res } from '@nestjs/common';
import { HealthCheckService } from './healthcheck.service';

@Controller()
export class AppController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  getHello(): string {
    return this.healthCheckService.getHello();
  }

  @Get('')
  redirectToSwagger(@Res() res): void {
    res.redirect('/api');
  }

  @Get('health')
  healthCheck(): object {
    return this.healthCheckService.getHealthStatus();
  }
}
