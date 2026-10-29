import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../../common/validators/uz-phone';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName: string;

  @IsString()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  otpToken?: string;
}
