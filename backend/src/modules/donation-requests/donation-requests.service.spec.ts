import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DonationRequestStatus, DonationStatus, UserRole } from '@prisma/client';
import { DonationRequestsService } from './donation-requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('DonationRequestsService', () => {
  let service: DonationRequestsService;

  const prismaMock = {
    donation: { findUnique: jest.fn(), update: jest.fn() },
    donationRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown): Promise<unknown> =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => Promise<unknown>)(prismaMock)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const notificationsMock = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationRequestsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = module.get<DonationRequestsService>(DonationRequestsService);
  });

  it('rejects requesting your own donation', async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorId: 'me',
      status: DonationStatus.AVAILABLE,
    });

    await expect(
      service.create('me', { donationId: 'd1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects requesting a donation that is not open', async () => {
    prismaMock.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorId: 'owner-1',
      status: DonationStatus.RESERVED,
    });

    await expect(
      service.create('someone', { donationId: 'd1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only lets the donor (or admin) approve a request', async () => {
    prismaMock.donationRequest.findUnique.mockResolvedValue({
      id: 'r1',
      status: DonationRequestStatus.PENDING,
      donation: { donorId: 'owner-1' },
    });

    await expect(
      service.approve('r1', { id: 'not-the-owner', role: UserRole.user }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approving a request reserves the donation and auto-rejects other pending requests', async () => {
    const donation = {
      id: 'd1',
      title: 'Winter jacket',
      donorId: 'owner-1',
      status: DonationStatus.REQUESTED,
    };
    prismaMock.donationRequest.findUnique
      .mockResolvedValueOnce({
        id: 'r1',
        donationId: 'd1',
        requesterId: 'requester-1',
        status: DonationRequestStatus.PENDING,
        donation,
      })
      .mockResolvedValueOnce({ id: 'r1', status: DonationRequestStatus.APPROVED });
    prismaMock.donation.update.mockResolvedValue({
      ...donation,
      status: DonationStatus.RESERVED,
    });
    prismaMock.donationRequest.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.donationRequest.findMany.mockResolvedValue([{ requesterId: 'requester-2' }]);

    const result = await service.approve('r1', { id: 'owner-1', role: UserRole.user });

    expect(result.status).toBe(DonationRequestStatus.APPROVED);
    expect(prismaMock.donation.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { status: DonationStatus.RESERVED },
    });
    expect(prismaMock.donationRequest.updateMany).toHaveBeenCalledWith({
      where: { donationId: 'd1', status: DonationRequestStatus.PENDING },
      data: { status: DonationRequestStatus.REJECTED },
    });
    // Approved requester + the auto-rejected one both get notified.
    expect(notificationsMock.create).toHaveBeenCalledTimes(2);
    expect(notificationsMock.create).toHaveBeenCalledWith(
      'requester-2',
      'REQUEST_REJECTED',
      expect.any(String),
      expect.any(String),
    );
  });

  it('refuses to approve a request that stopped being pending concurrently', async () => {
    prismaMock.donationRequest.findUnique.mockResolvedValueOnce({
      id: 'r1',
      donationId: 'd1',
      requesterId: 'requester-1',
      status: DonationRequestStatus.PENDING,
      donation: { id: 'd1', title: 'Jacket', donorId: 'owner-1' },
    });
    prismaMock.donationRequest.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.approve('r1', { id: 'owner-1', role: UserRole.user }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.donation.update).not.toHaveBeenCalled();
  });
});
