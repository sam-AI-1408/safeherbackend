import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Gzip Compression
  app.use(compression());

  // 3. CORS configuration
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  // 4. API Versioning / Prefix
  app.setGlobalPrefix(apiPrefix);

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 6. OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SafeHer Campus API')
    .setDescription(
      'Enterprise Women Safety, Harassment Redressal, and Campus Grievance Ecosystem API Specification',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication & Identity', 'User onboarding, login, session rotation, and logout')
    .addTag('Health & Monitoring', 'Service readiness, database health, and system metrics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SafeHer Campus API Docs',
  });

  // 7. Start HTTP Server on 0.0.0.0
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 SafeHer Campus Backend running on: http://0.0.0.0:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger Documentation active at: http://localhost:${port}/api/docs`);
}

bootstrap();
