import { Module } from '@nestjs/common';
import { DonationRequestsService } from './donation-requests.service';
import { DonationRequestsController } from './donation-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DonationRequestsController],
  providers: [DonationRequestsService],
  exports: [DonationRequestsService],
})
export class DonationRequestsModule {}
