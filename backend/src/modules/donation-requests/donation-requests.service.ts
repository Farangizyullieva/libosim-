import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DonationRequestStatus,
  DonationStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationRequestDto } from './dto/create-donation-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

const OPEN_CONVERSATION_STATUSES: DonationRequestStatus[] = [
  DonationRequestStatus.PENDING,
  DonationRequestStatus.APPROVED,
  DonationRequestStatus.RESERVED,
  DonationRequestStatus.COLLECTED,
];

const OPEN_DONATION_STATUSES: DonationStatus[] = [
  DonationStatus.AVAILABLE,
  DonationStatus.REQUESTED,
];

@Injectable()
export class DonationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(requesterId: string, dto: CreateDonationRequestDto) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: dto.donationId },
    });
    if (!donation) throw new NotFoundException('Donation not found');

    if (donation.donorId === requesterId) {
      throw new BadRequestException('You cannot request your own donation');
    }
    if (!OPEN_DONATION_STATUSES.includes(donation.status)) {
      throw new BadRequestException(
        `This donation is no longer open for requests (status: ${donation.status})`,
      );
    }

    // Enforced at the application level rather than a DB constraint: a
    // partial/conditional unique index (unique only while status=PENDING)
    // isn't expressible in Prisma's schema DSL. This leaves a small
    // theoretical race window under concurrent double-submits; acceptable
    // for this volume, but worth revisiting with a raw-SQL partial index
    // in a custom migration if it ever becomes a real problem.
    const existingPending = await this.prisma.donationRequest.findFirst({
      where: {
        donationId: dto.donationId,
        requesterId,
        status: DonationRequestStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'You already have a pending request for this donation',
      );
    }

    const request = await this.prisma.donationRequest.create({
      data: {
        donationId: dto.donationId,
        requesterId,
        note: dto.note ?? null,
      },
    });

    if (donation.status === DonationStatus.AVAILABLE) {
      await this.prisma.donation.update({
        where: { id: donation.id },
        data: { status: DonationStatus.REQUESTED },
      });
    }

    await this.notifications.create(
      donation.donorId,
      NotificationType.DONATION_REQUESTED,
      'Xayriyangizga yangi so\'rov',
      `Kimdir sizning "${donation.title}" xayriyangizga so'rov yubordi.`,
    );

    return request;
  }

  // How many requests on the donor's own donations still await an answer.
  async countIncomingPending(donorId: string) {
    const pending = await this.prisma.donationRequest.count({
      where: { status: DonationRequestStatus.PENDING, donation: { donorId } },
    });
    return { pending };
  }

  async findMine(requesterId: string, page = 1, limit = 20) {
    return this.paginated({ requesterId }, page, limit);
  }

  // For the donor (or admin) to see who has requested one of their donations.
  async findForDonation(
    donationId: string,
    viewer: { id: string; role: UserRole },
    page = 1,
    limit = 20,
  ) {
    const donation = await this.prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) throw new NotFoundException('Donation not found');
    if (donation.donorId !== viewer.id && viewer.role !== UserRole.admin) {
      throw new ForbiddenException('You do not own this donation');
    }
    return this.paginated({ donationId }, page, limit);
  }

  async approve(requestId: string, actor: { id: string; role: UserRole }) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertCanModerate(request.donation.donorId, actor);

    if (request.status !== DonationRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const { updated, autoRejected } = await this.prisma.$transaction(async (tx) => {
      // Re-check PENDING inside the transaction: two concurrent approvals
      // (or approve racing a cancel) must not both go through.
      const claimed = await tx.donationRequest.updateMany({
        where: { id: requestId, status: DonationRequestStatus.PENDING },
        data: { status: DonationRequestStatus.APPROVED },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Only pending requests can be approved');
      }

      await tx.donation.update({
        where: { id: request.donationId },
        data: { status: DonationStatus.RESERVED },
      });

      // Single-item assumption: once one request is approved/reserved,
      // every other still-pending request on the same donation is
      // auto-rejected.
      const others = await tx.donationRequest.findMany({
        where: {
          donationId: request.donationId,
          status: DonationRequestStatus.PENDING,
        },
        select: { requesterId: true },
      });
      await tx.donationRequest.updateMany({
        where: {
          donationId: request.donationId,
          status: DonationRequestStatus.PENDING,
        },
        data: { status: DonationRequestStatus.REJECTED },
      });

      const approved = await tx.donationRequest.findUnique({ where: { id: requestId } });
      return { updated: approved!, autoRejected: others };
    });

    for (const other of autoRejected) {
      await this.notifications.create(
        other.requesterId,
        NotificationType.REQUEST_REJECTED,
        "So'rovingiz rad etildi",
        `"${request.donation.title}" boshqa foydalanuvchiga berildi.`,
      );
    }

    await this.notifications.create(
      request.requesterId,
      NotificationType.REQUEST_APPROVED,
      "So'rovingiz tasdiqlandi",
      `"${request.donation.title}" uchun so'rovingiz tasdiqlandi. Endi xayriya beruvchi telefon raqamingizni ko'ra oladi.`,
    );

    return updated;
  }

  async reject(requestId: string, actor: { id: string; role: UserRole }) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertCanModerate(request.donation.donorId, actor);

    if (request.status !== DonationRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const updated = await this.prisma.donationRequest.update({
      where: { id: requestId },
      data: { status: DonationRequestStatus.REJECTED },
    });

    await this.reopenDonationIfNoPending(request.donationId);

    await this.notifications.create(
      request.requesterId,
      NotificationType.REQUEST_REJECTED,
      "So'rovingiz rad etildi",
      `"${request.donation.title}" uchun so'rovingiz rad etildi.`,
    );

    return updated;
  }

  async collect(requestId: string, actor: { id: string; role: UserRole }) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertCanModerate(request.donation.donorId, actor);

    if (request.status !== DonationRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be marked collected');
    }

    return this.prisma.donationRequest.update({
      where: { id: requestId },
      data: { status: DonationRequestStatus.COLLECTED },
    });
  }

  async complete(requestId: string, actor: { id: string; role: UserRole }) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertCanModerate(request.donation.donorId, actor);

    if (request.status !== DonationRequestStatus.COLLECTED) {
      throw new BadRequestException('Only collected requests can be completed');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.donationRequest.update({
        where: { id: requestId },
        data: { status: DonationRequestStatus.COMPLETED },
      }),
      this.prisma.donation.update({
        where: { id: request.donationId },
        data: { status: DonationStatus.COMPLETED },
      }),
    ]);

    await this.notifications.create(
      request.requesterId,
      NotificationType.DONATION_COMPLETED,
      'Xayriya yakunlandi',
      `"${request.donation.title}" muvaffaqiyatli topshirildi deb belgilandi. Libosim'dan foydalanganingiz uchun rahmat!`,
    );

    return updated;
  }

  async cancel(requestId: string, requesterId: string) {
    const request = await this.getWithDonationOrFail(requestId);
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('You do not own this request');
    }
    if (request.status !== DonationRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updated = await this.prisma.donationRequest.update({
      where: { id: requestId },
      data: { status: DonationRequestStatus.CANCELLED },
    });

    await this.reopenDonationIfNoPending(request.donationId);

    return updated;
  }

  // --- conversation ---

  // Only the requester and the donor (or an admin) can see the thread.
  async listMessages(requestId: string, actor: { id: string; role: UserRole }) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertParticipant(request, actor);
    return this.prisma.requestMessage.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, fullName: true } } },
    });
  }

  async sendMessage(requestId: string, actor: { id: string; role: UserRole }, text: string) {
    const request = await this.getWithDonationOrFail(requestId);
    this.assertParticipant(request, actor);
    if (!OPEN_CONVERSATION_STATUSES.includes(request.status)) {
      throw new BadRequestException('This conversation is closed');
    }

    const message = await this.prisma.requestMessage.create({
      data: { requestId, senderId: actor.id, text },
      include: { sender: { select: { id: true, fullName: true } } },
    });

    // Tell the other side — the donor if the requester wrote, and vice versa.
    const recipientId =
      actor.id === request.requesterId ? request.donation.donorId : request.requesterId;
    await this.notifications.create(
      recipientId,
      NotificationType.NEW_MESSAGE,
      `"${request.donation.title}" bo'yicha yangi xabar`,
      `${message.sender.fullName}: ${text.length > 140 ? `${text.slice(0, 140)}…` : text}`,
    );

    return message;
  }

  // --- helpers ---

  private assertParticipant(
    request: { requesterId: string; donation: { donorId: string } },
    actor: { id: string; role: UserRole },
  ) {
    const isParticipant =
      actor.id === request.requesterId || actor.id === request.donation.donorId;
    if (!isParticipant && actor.role !== UserRole.admin) {
      throw new ForbiddenException('You are not part of this conversation');
    }
  }

  private async reopenDonationIfNoPending(donationId: string) {
    const stillPending = await this.prisma.donationRequest.count({
      where: { donationId, status: DonationRequestStatus.PENDING },
    });
    if (stillPending === 0) {
      await this.prisma.donation.updateMany({
        where: { id: donationId, status: DonationStatus.REQUESTED },
        data: { status: DonationStatus.AVAILABLE },
      });
    }
  }

  private assertCanModerate(donationDonorId: string, actor: { id: string; role: UserRole }) {
    if (donationDonorId !== actor.id && actor.role !== UserRole.admin) {
      throw new ForbiddenException('You do not own this donation');
    }
  }

  private async getWithDonationOrFail(id: string) {
    const request = await this.prisma.donationRequest.findUnique({
      where: { id },
      include: { donation: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async paginated(
    where: { requesterId?: string; donationId?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      this.prisma.donationRequest.findMany({
        where,
        include: {
          donation: true,
          requester: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donationRequest.count({ where }),
    ]);
    return {
      items: rows,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }
}
