import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { OtpService } from '../auth/otp.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.findOrFail(userId);
    return this.toPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findOrFail(userId);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existing) throw new BadRequestException('Email already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return this.toPublic(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findOrFail(userId);
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { updated: true };
  }

  // Changing your phone number is how you log in from now on, so it always
  // requires OTP proof of ownership of the new number — unlike registration,
  // this isn't gated behind the OTP_ENABLED dev-convenience flag, since
  // skipping it here would let an attacker with a stolen session hijack the
  // account's login phone with no verification at all.
  async changePhone(userId: string, dto: ChangePhoneDto) {
    await this.findOrFail(userId);
    this.otp.consumeVerification(dto.phone, dto.otpToken);

    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('A user with this phone already exists');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { phone: dto.phone },
    });
    return this.toPublic(updated);
  }

  async createTelegramLinkToken(userId: string) {
    await this.findOrFail(userId);
    const token = randomUUID();
    const ttlMinutes = this.config.get<number>('telegram.linkTokenTtlMinutes') ?? 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.telegramLinkToken.create({
      data: { userId, token, expiresAt },
    });

    const botUsername = this.config.get<string>('telegram.botUsername');
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;

    return { token, deepLink, expiresAt };
  }

  // --- Admin ---

  async listUsers(page = 1, limit = 20, isBlocked?: boolean) {
    const skip = (page - 1) * limit;
    const where = isBlocked === undefined ? {} : { isBlocked };
    const [rows, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((u) => this.toPublic(u)),
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }

  async setBlocked(userId: string, isBlocked: boolean) {
    const user = await this.findOrFail(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { isBlocked },
    });
    return this.toPublic(updated);
  }

  private async findOrFail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private toPublic(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      telegramLinked: !!user.telegramChatId,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt,
    };
  }
}
