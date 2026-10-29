import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../../common/decorators/public.decorator';
import { successRes } from '../../common/helpers/success-res';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('otp/config')
  getOtpConfig() {
    return successRes({ enabled: this.config.get<boolean>('otp.enabled') });
  }

  // Tighter than the global default (100/min) — sending an OTP costs real
  // money once a real SMS provider is wired up, and this endpoint doubles
  // as a phone-number enumeration surface if left unthrottled.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Public()
  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = this.otpService.requestCode(dto.phone);
    return successRes(result, 'Code sent');
  }

  // otp.service already caps wrong-code attempts per phone (OTP_ATTEMPTS);
  // this per-IP cap stops someone from cycling through many phone+code
  // guesses quickly to route around that per-phone limit.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = this.otpService.verifyCode(dto.phone, dto.code);
    return successRes(result, 'Phone verified');
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return successRes(result, 'Registered successfully', 201);
  }

  // Brute-force / credential-stuffing guard: a handful of wrong-password
  // attempts per minute is normal user error, dozens is an attack.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return successRes(result, 'Logged in successfully');
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return successRes(result, 'Token refreshed');
  }

  @Public()
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.logout(dto.refreshToken);
    return successRes(result, 'Logged out successfully');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me')
  async me(@CurrentUser() user: { id: string; role: string }) {
    return successRes(user, 'Current user');
  }
}
