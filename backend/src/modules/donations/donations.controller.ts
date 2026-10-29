import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { QueryDonationDto } from './dto/query-donation.dto';
import { RejectDonationDto } from './dto/reject-donation.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { successRes } from '../../common/helpers/success-res';

@ApiTags('donations')
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  async create(
    @CurrentUser('id') donorId: string,
    @Body() dto: CreateDonationDto,
  ) {
    const donation = await this.donationsService.create(donorId, dto);
    return successRes(donation, 'Donation submitted for review', 201);
  }

  @Public()
  @Get()
  async findAll(
    @Query() query: QueryDonationDto,
    @CurrentUser() viewer?: { id: string; role: UserRole },
  ) {
    const result = await this.donationsService.findAll(query, viewer);
    return successRes(result);
  }

  @Get('mine')
  async findMine(
    @CurrentUser('id') donorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.donationsService.findMine(
      donorId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return successRes(result);
  }

  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() viewer?: { id: string; role: UserRole },
  ) {
    const donation = await this.donationsService.findOne(id, viewer);
    return successRes(donation);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') donorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDonationDto,
  ) {
    const donation = await this.donationsService.update(id, donorId, dto);
    return successRes(donation, 'Donation updated');
  }

  @Delete(':id')
  async cancel(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    const donation = await this.donationsService.cancel(id, donorId);
    return successRes(donation, 'Donation cancelled');
  }

  // --- Admin moderation ---

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Get('admin/all')
  async adminFindAll(
    @CurrentUser() viewer: { id: string; role: UserRole },
    @Query() query: QueryDonationDto,
  ) {
    const result = await this.donationsService.findAll(query, viewer);
    return successRes(result);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    const donation = await this.donationsService.approve(id);
    return successRes(donation, 'Donation approved');
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectDonationDto) {
    const donation = await this.donationsService.reject(id, dto.reason);
    return successRes(donation, 'Donation rejected');
  }
}
