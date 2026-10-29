import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// A single file directly inside /uploads with one of our image extensions:
// either a UUID name from UploadsController or a seeded demo-*.jpg photo.
// No "/" or ".." can appear in the name, so absolute paths, "../" segments
// and external URLs are still rejected — donations.service.ts later joins
// this value onto a filesystem path to run image moderation, so this check
// is a path-traversal guard, not just a cosmetic one.
const UPLOADED_IMAGE_PATH_REGEX = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9_-]{0,80}\.(jpg|jpeg|png|webp)$/;
import {
  DonationAgeGroup,
  DonationCondition,
  DonationGender,
} from '@prisma/client';

export class CreateDonationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  size?: string;

  @IsEnum(DonationCondition)
  condition: DonationCondition;

  @IsEnum(DonationGender)
  gender: DonationGender;

  @IsEnum(DonationAgeGroup)
  ageGroup: DonationAgeGroup;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(UPLOADED_IMAGE_PATH_REGEX, { each: true })
  images?: string[];
}
