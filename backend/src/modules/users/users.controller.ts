import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { CurrentUser, Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { successRes } from '../../common/helpers/success-res';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    const profile = await this.usersService.getProfile(userId);
    return successRes(profile);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(userId, dto);
    return successRes(profile, 'Profile updated');
  }

  @Patch('me/password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.usersService.changePassword(userId, dto);
    return successRes(result, 'Password changed');
  }

  @Patch('me/phone')
  async changePhone(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePhoneDto,
  ) {
    const profile = await this.usersService.changePhone(userId, dto);
    return successRes(profile, 'Phone number changed');
  }

  @Post('me/telegram-link')
  async createTelegramLink(@CurrentUser('id') userId: string) {
    const result = await this.usersService.createTelegramLinkToken(userId);
    return successRes(result, 'Telegram link token created');
  }

  // --- Admin ---

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('blocked') blocked?: string,
  ) {
    const result = await this.usersService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      blocked === undefined ? undefined : blocked === 'true',
    );
    return successRes(result);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/block')
  async block(@Param('id') id: string) {
    const result = await this.usersService.setBlocked(id, true);
    return successRes(result, 'User blocked');
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/unblock')
  async unblock(@Param('id') id: string) {
    const result = await this.usersService.setBlocked(id, false);
    return successRes(result, 'User unblocked');
  }
}
