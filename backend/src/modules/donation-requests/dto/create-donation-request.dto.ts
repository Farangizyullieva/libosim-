import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDonationRequestDto {
  @IsUUID()
  donationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
