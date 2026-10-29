import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ErrorNotifierService } from './common/error-notifier/error-notifier.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Helmet's default Cross-Origin-Resource-Policy is "same-origin", which
  // makes the browser refuse to load /uploads/* images when they're
  // embedded from the frontend's different origin (e.g. Vite on :5173) —
  // shows up as a broken-image icon even though the request itself
  // succeeds. This is a public API serving public donation photos, so
  // cross-origin embedding is intentional.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Served at /uploads/* — deliberately outside the api/v1 prefix set below,
  // since useStaticAssets registers middleware directly on the underlying
  // Express app rather than through Nest's routing.
  app.useStaticAssets(join(process.cwd(), config.get<string>('uploads.dir') ?? 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Errors thrown outside any HTTP request (a bad timer callback, a
  // fire-and-forget promise with no .catch) never reach AllExceptionsFilter
  // — report them the same way instead of letting them vanish into the
  // terminal only.
  const errorNotifier = app.get(ErrorNotifierService);
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    errorNotifier.report(err, 'uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error(reason);
    errorNotifier.report(reason, 'unhandledRejection');
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Libosim API')
    .setDescription('Clothing donation platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Libosim API running on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
