import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const logger = new Logger('NestApplication');
  try {
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    // Set global prefix before Swagger setup
    app.setGlobalPrefix('/api/v1');

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Zerocard API')
      .setDescription('API documentation for the Zerocard system')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'x-identity-token', in: 'header' },
        'identity-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customJs: '/swagger-token-persistence.js',
      customSiteTitle: 'Zerocard API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    const configService = app.get(ConfigService);

    const port = parseInt(configService.get<string>('PORT') || '3000', 10);

    if (isNaN(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid PORT value: ${port}`);
    }
    await app.listen(port);

    logger.log(`Application is running on: ${await app.getUrl()}`);
    logger.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
  } catch (error) {
    logger.error(
      `Failed to start the application: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
bootstrap();
