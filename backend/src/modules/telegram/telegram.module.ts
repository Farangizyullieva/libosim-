import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { DonationsModule } from '../donations/donations.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [DonationsModule, CategoriesModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
