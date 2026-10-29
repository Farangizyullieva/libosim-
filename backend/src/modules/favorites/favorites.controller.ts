import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { successRes } from '../../common/helpers/success-res';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.favoritesService.list(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return successRes(result);
  }

  @Get('ids')
  async ids(@CurrentUser('id') userId: string) {
    const ids = await this.favoritesService.listIdsForUser(userId);
    return successRes(ids);
  }

  @Post(':donationId')
  async add(
    @CurrentUser('id') userId: string,
    @Param('donationId') donationId: string,
  ) {
    const favorite = await this.favoritesService.add(userId, donationId);
    return successRes(favorite, 'Added to favorites', 201);
  }

  @Delete(':donationId')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('donationId') donationId: string,
  ) {
    const result = await this.favoritesService.remove(userId, donationId);
    return successRes(result, 'Removed from favorites');
  }
}
