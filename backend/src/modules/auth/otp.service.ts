import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID } from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

interface VerifiedEntry {
  phone: string;
  expiresAt: number;
}

const VERIFIED_TOKEN_TTL_MS = 10 * 60 * 1000;

// In-memory, matching the pattern already used for the Telegram bot's
// wizard state — fine for this volume, and avoids a DB migration for
// data that's only ever relevant for a couple of minutes.
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly pending = new Map<string, OtpEntry>();
  private readonly verified = new Map<string, VerifiedEntry>();

  constructor(private readonly config: ConfigService) {}

  requestCode(phone: string) {
    const now = Date.now();
    const resendSeconds = this.config.get<number>('otp.resendSeconds')!;
    const existing = this.pending.get(phone);
    if (existing && now - existing.lastSentAt < resendSeconds * 1000) {
      const waitSeconds = Math.ceil((resendSeconds * 1000 - (now - existing.lastSentAt)) / 1000);
      throw new BadRequestException(`Please wait ${waitSeconds}s before requesting another code`);
    }

    const ttlSeconds = this.config.get<number>('otp.ttlSeconds')!;
    const code = randomInt(100000, 999999).toString();
    this.pending.set(phone, {
      code,
      expiresAt: now + ttlSeconds * 1000,
      attempts: 0,
      lastSentAt: now,
    });

    // Dev mode: no SMS provider configured yet, so the code is just
    // logged here. Wire up a real gateway (e.g. Eskiz.uz) later without
    // changing the request/verify contract below.
    this.logger.log(`OTP for ${phone}: ${code} (dev mode - SMS not sent)`);

    return { expiresInSeconds: ttlSeconds };
  }

  verifyCode(phone: string, code: string) {
    const entry = this.pending.get(phone);
    if (!entry || entry.expiresAt < Date.now()) {
      this.pending.delete(phone);
      throw new BadRequestException('Code expired or not requested, please request a new one');
    }

    const maxAttempts = this.config.get<number>('otp.maxAttempts')!;
    if (entry.attempts >= maxAttempts) {
      this.pending.delete(phone);
      throw new BadRequestException('Too many attempts, please request a new code');
    }

    if (entry.code !== code) {
      entry.attempts += 1;
      throw new BadRequestException(
        `Invalid code (${maxAttempts - entry.attempts} attempts left)`,
      );
    }

    this.pending.delete(phone);
    const token = randomUUID();
    this.verified.set(token, { phone, expiresAt: Date.now() + VERIFIED_TOKEN_TTL_MS });
    return { otpToken: token };
  }

  // Called by AuthService.register — throws unless `token` was issued by a
  // successful verifyCode() for this exact phone, within the last 10 minutes.
  // Deletes the token either way so it can't be reused.
  consumeVerification(phone: string, token: string) {
    const entry = this.verified.get(token);
    this.verified.delete(token);
    if (!entry || entry.phone !== phone || entry.expiresAt < Date.now()) {
      throw new BadRequestException('Phone number is not verified, please verify it first');
    }
  }
}
