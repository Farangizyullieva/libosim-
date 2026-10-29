import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OtpService } from './otp.service';

const BCRYPT_ROUNDS = 12;

// Refresh tokens are 48 random bytes, so a fast deterministic hash is safe
// here (no brute-force risk like with passwords) and lets us look the token
// up directly instead of bcrypt-comparing against every stored token.
function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    if (this.config.get<boolean>('otp.enabled')) {
      this.otp.consumeVerification(dto.phone, dto.otpToken ?? '');
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('A user with this phone already exists');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email ?? null,
        passwordHash,
      },
    });

    return this.issueTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid phone or password');

    return this.issueTokenPair(user);
  }

  async refresh(rawToken: string) {
    const match = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashRefreshToken(rawToken),
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!match) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: match.userId } });
    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Account unavailable');
    }

    // Rotation: revoke the used token immediately so it can never be replayed.
    // Conditional on isRevoked=false so two concurrent refreshes with the
    // same token can't both succeed.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: match.id, isRevoked: false },
      data: { isRevoked: true },
    });
    if (revoked.count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueTokenPair(user, match.id);
  }

  async logout(rawToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), isRevoked: false },
      data: { isRevoked: true },
    });
    return { loggedOut: true };
  }

  private async issueTokenPair(user: User, replacedById?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const ttlDays = this.parseDaysFromExpiresIn(
      this.config.get<string>('jwt.refreshExpiresIn') ?? '30d',
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const created = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    if (replacedById) {
      await this.prisma.refreshToken.update({
        where: { id: replacedById },
        data: { replacedById: created.id },
      });
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private parseDaysFromExpiresIn(value: string): number {
    const match = /^(\d+)d$/.exec(value);
    return match ? parseInt(match[1], 10) : 30;
  }
}
