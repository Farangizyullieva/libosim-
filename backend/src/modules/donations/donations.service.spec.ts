import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { DonationStatus } from '@prisma/client';
import { DonationsService } from './donations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ImageModerationService } from '../moderation/image-moderation.service';

describe('DonationsService', () => {
  let service: DonationsService;

  const prismaMock = {
    donation: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    category: { findUnique: jest.fn() },
  };
  const notificationsMock = { create: jest.fn() };
  const imageModerationMock = {
    checkClothingImage: jest.fn().mockResolvedValue({ checked: false, looksLikeClothing: true, labels: [] }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: ImageModerationService, useValue: imageModerationMock },
      ],
    }).compile();

    service = module.get<DonationsService>(DonationsService);
  });

  it('rejects editing a donation owned by someone else', async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorId: 'owner-1',
      status: DonationStatus.PENDING_REVIEW,
    });

    await expect(
      service.update('d1', 'someone-else', { title: 'New title' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects editing a donation that is already RESERVED', async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorId: 'owner-1',
      status: DonationStatus.RESERVED,
    });

    await expect(
      service.update('d1', 'owner-1', { title: 'New title' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only approves donations that are PENDING_REVIEW', async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: 'd1',
      status: DonationStatus.AVAILABLE,
    });

    await expect(service.approve('d1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('approves a pending donation and notifies the donor', async () => {
    const donation = {
      id: 'd1',
      donorId: 'owner-1',
      status: DonationStatus.PENDING_REVIEW,
      rejectionReason: null,
    };
    prismaMock.donation.findUnique.mockResolvedValue(donation);
    prismaMock.donation.update.mockResolvedValue({
      ...donation,
      status: DonationStatus.AVAILABLE,
    });

    const result = await service.approve('d1');

    expect(result.status).toBe(DonationStatus.AVAILABLE);
    expect(prismaMock.donation.update).toHaveBeenCalled();
    expect(notificationsMock.create).toHaveBeenCalledWith(
      'owner-1',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });
});
