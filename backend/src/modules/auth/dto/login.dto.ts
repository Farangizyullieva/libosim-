import { IsString, Matches, MinLength } from 'class-validator';
import { UZ_PHONE_MESSAGE, UZ_PHONE_REGEX } from '../../../common/validators/uz-phone';

export class LoginDto {
  @IsString()
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;
}
