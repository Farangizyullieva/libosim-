import { IsString, Length, Matches } from 'class-validator';
import { UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../../common/validators/uz-phone';

export class VerifyOtpDto {
  @IsString()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
