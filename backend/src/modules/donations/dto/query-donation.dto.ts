import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  DonationAgeGroup,
  DonationCondition,
  DonationGender,
  DonationStatus,
} from '@prisma/client';

export class QueryDonationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsEnum(DonationCondition)
  condition?: DonationCondition;

  @IsOptional()
  @IsEnum(DonationGender)
  gender?: DonationGender;

  @IsOptional()
  @IsEnum(DonationAgeGroup)
  ageGroup?: DonationAgeGroup;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DonationStatus)
  status?: DonationStatus;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort?: 'newest' | 'oldest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
