import { createHash } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';

describe('AuthService', () => {
  let service: AuthService;
  const otpMock = {
    consumeVerification: jest.fn(),
  };
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OtpService, useValue: otpMock },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-jwt') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                'jwt.accessSecret': 'secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '30d',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a new user and returns an access + refresh token pair', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      fullName: 'Test User',
      phone: '+998900000000',
      email: null,
      role: 'user',
      passwordHash: 'hashed',
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const result = await service.register({
      fullName: 'Test User',
      phone: '+998900000000',
      password: 'password123',
      otpToken: 'valid-otp-token',
    });

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.phone).toBe('+998900000000');
  });

  it('stores refresh tokens as a SHA-256 hash and looks them up by it', async () => {
    const user = {
      id: 'user-1',
      fullName: 'Test User',
      phone: '+998900000000',
      email: null,
      role: 'user',
      passwordHash: 'hashed',
      isBlocked: false,
    };
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(user);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
    const { refreshToken } = await service.register({
      fullName: user.fullName,
      phone: user.phone,
      password: 'password123',
    });

    const expectedHash = createHash('sha256').update(refreshToken).digest('hex');
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tokenHash: expectedHash }),
    });

    prismaMock.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1', userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const result = await service.refresh(refreshToken);
    expect(result.accessToken).toBe('signed-jwt');
    expect(prismaMock.refreshToken.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ tokenHash: expectedHash, isRevoked: false }),
    });
  });

  it('rejects a refresh token that was already rotated by a concurrent request', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1', userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', isBlocked: false });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('some-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });
});
