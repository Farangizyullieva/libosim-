import { Global, Module } from '@nestjs/common';
import { ErrorNotifierService } from './error-notifier.service';

@Global()
@Module({
  providers: [ErrorNotifierService],
  exports: [ErrorNotifierService],
})
export class ErrorNotifierModule {}
