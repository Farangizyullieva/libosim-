import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DonationRequestsService } from './donation-requests.service';
import { CreateDonationRequestDto } from './dto/create-donation-request.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { successRes } from '../../common/helpers/success-res';
import { UserRole } from '@prisma/client';

@ApiTags('donation-requests')
@ApiBearerAuth()
@Controller('donation-requests')
export class DonationRequestsController {
  constructor(private readonly requestsService: DonationRequestsService) {}

  @Post()
  async create(
    @CurrentUser('id') requesterId: string,
    @Body() dto: CreateDonationRequestDto,
  ) {
    const request = await this.requestsService.create(requesterId, dto);
    return successRes(request, 'Request sent to the donor', 201);
  }

  @Get('incoming/count')
  async incomingCount(@CurrentUser('id') donorId: string) {
    const result = await this.requestsService.countIncomingPending(donorId);
    return successRes(result);
  }

  @Get('mine')
  async findMine(
    @CurrentUser('id') requesterId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.requestsService.findMine(
      requesterId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return successRes(result);
  }

  @Get('donation/:donationId')
  async findForDonation(
    @CurrentUser() viewer: { id: string; role: UserRole },
    @Param('donationId') donationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.requestsService.findForDonation(
      donationId,
      viewer,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return successRes(result);
  }

  @Patch(':id/approve')
  async approve(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
  ) {
    const request = await this.requestsService.approve(id, actor);
    return successRes(request, 'Request approved');
  }

  @Patch(':id/reject')
  async reject(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
  ) {
    const request = await this.requestsService.reject(id, actor);
    return successRes(request, 'Request rejected');
  }

  @Patch(':id/collect')
  async collect(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
  ) {
    const request = await this.requestsService.collect(id, actor);
    return successRes(request, 'Marked as collected');
  }

  @Patch(':id/complete')
  async complete(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
  ) {
    const request = await this.requestsService.complete(id, actor);
    return successRes(request, 'Donation marked as completed');
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
  ) {
    const result = await this.requestsService.listMessages(id, actor);
    return successRes(result);
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() actor: { id: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.requestsService.sendMessage(id, actor, dto.text);
    return successRes(message, 'Message sent', 201);
  }

  @Delete(':id')
  async cancel(@CurrentUser('id') requesterId: string, @Param('id') id: string) {
    const request = await this.requestsService.cancel(id, requesterId);
    return successRes(request, 'Request cancelled');
  }
}
