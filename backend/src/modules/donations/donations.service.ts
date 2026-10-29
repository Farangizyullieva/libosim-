import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DonationRequestStatus,
  DonationStatus,
  UserRole,
  Prisma,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { QueryDonationDto } from './dto/query-donation.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ImageModerationService } from '../moderation/image-moderation.service';

// Statuses visible to the general public / non-owning users.
const PUBLICLY_VISIBLE_STATUSES: DonationStatus[] = [
  DonationStatus.AVAILABLE,
  DonationStatus.REQUESTED,
];

const EDITABLE_STATUSES: DonationStatus[] = [
  DonationStatus.DRAFT,
  DonationStatus.PENDING_REVIEW,
  DonationStatus.AVAILABLE,
];

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly imageModeration: ImageModerationService,
  ) {}

  async create(donorId: string, dto: CreateDonationDto) {
    // Category is optional for donors — an unspecified one falls back to the
    // catch-all "other" category so every donation still has one.
    const category = dto.categoryId
      ? await this.prisma.category.findUnique({ where: { id: dto.categoryId } })
      : await this.prisma.category.findUnique({ where: { slug: 'other' } });
    if (!category) throw new BadRequestException('Invalid category');

    // Automated "is this actually clothing" check on the cover photo. When
    // it can't run (disabled, no API key, unreachable) it stays neutral —
    // published immediately, same as when no check existed. It only holds
    // a listing back for human review when it actively recognizes the
    // image as NOT clothing.
    const firstImage = dto.images?.[0];
    const moderation = firstImage
      ? await this.imageModeration.checkClothingImage(firstImage)
      : { checked: false, looksLikeClothing: true, labels: [] };
    const autoFlagged = moderation.checked && !moderation.looksLikeClothing;

    const donation = await this.prisma.donation.create({
      data: {
        donorId,
        title: dto.title,
        description: dto.description,
        categoryId: category.id,
        size: dto.size ?? null,
        condition: dto.condition,
        gender: dto.gender,
        ageGroup: dto.ageGroup,
        quantity: dto.quantity ?? 1,
        images: dto.images ?? [],
        location: dto.location ?? null,
        autoFlagged,
        // Published immediately unless the automated check flagged the
        // photo as not looking like clothing, in which case it waits for
        // a human to approve/reject it.
        status: autoFlagged ? DonationStatus.PENDING_REVIEW : DonationStatus.AVAILABLE,
      },
    });

    await this.notifications.create(
      donorId,
      NotificationType.DONATION_SUBMITTED,
      autoFlagged ? "Xayriya ko'rib chiqilmoqda" : 'Xayriya e\'lon qilindi',
      autoFlagged
        ? "Rasmda kiyim borligini avtomatik tasdiqlab bo'lmadi, shuning uchun tez orada ko'rib chiqiladi."
        : 'Xayriyangiz e\'lon qilindi va endi hammaga ko\'rinadi.',
    );

    return donation;
  }

  async findAll(query: QueryDonationDto, viewer?: { id: string; role: UserRole }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DonationWhereInput = {};

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.size) where.size = query.size;
    if (query.condition) where.condition = query.condition;
    if (query.gender) where.gender = query.gender;
    if (query.ageGroup) where.ageGroup = query.ageGroup;
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Visibility rule: admins may filter by any status explicitly. Everyone
    // else only ever sees publicly-available donations, regardless of what
    // status filter they pass in.
    if (viewer?.role === UserRole.admin) {
      if (query.status) where.status = query.status;
    } else {
      where.status = { in: PUBLICLY_VISIBLE_STATUSES };
    }

    const [rows, count] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: {
          category: true,
          donor: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      items: rows,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findOne(id: string, viewer?: { id: string; role: UserRole }) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        category: true,
        donor: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (!donation) throw new NotFoundException('Donation not found');

    const isOwner = viewer?.id === donation.donorId;
    const isAdmin = viewer?.role === UserRole.admin;
    const isPublic = PUBLICLY_VISIBLE_STATUSES.includes(donation.status);

    if (!isPublic && !isOwner && !isAdmin) {
      throw new NotFoundException('Donation not found');
    }

    // The donor's phone is only for signed-in users — this endpoint is
    // public, so returning it to anonymous visitors let anyone scrape every
    // donor's number.
    if (!viewer && donation.donor) {
      const { phone: _phone, ...donorWithoutPhone } = donation.donor;
      return { ...donation, donor: donorWithoutPhone };
    }

    return donation;
  }

  async findMine(donorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donation.count({ where: { donorId } }),
    ]);
    return {
      items: rows,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }

  async update(id: string, donorId: string, dto: UpdateDonationDto) {
    const donation = await this.getOwnedOrFail(id, donorId);

    // Only editable while still in review or already approved-but-not-yet
    // requested — once someone has requested it, details shouldn't shift
    // under them.
    if (!EDITABLE_STATUSES.includes(donation.status)) {
      throw new BadRequestException(
        `Donation cannot be edited while in status ${donation.status}`,
      );
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException('Invalid category');
    }

    // A new cover photo gets the same automated check as on create —
    // otherwise swapping the image after publishing bypassed moderation.
    const oldCover = (donation.images as string[] | null)?.[0];
    const newCover = dto.images?.[0];
    let autoFlagged = false;
    if (newCover && newCover !== oldCover) {
      const moderation = await this.imageModeration.checkClothingImage(newCover);
      autoFlagged = moderation.checked && !moderation.looksLikeClothing;
    }

    // Editing a live donation updates it in place, unless the new cover
    // photo was flagged — then it goes back to the review queue.
    return this.prisma.donation.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.ageGroup !== undefined && { ageGroup: dto.ageGroup }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(autoFlagged && { autoFlagged: true, status: DonationStatus.PENDING_REVIEW }),
      },
    });
  }

  async cancel(id: string, donorId: string) {
    const donation = await this.getOwnedOrFail(id, donorId);

    if (!EDITABLE_STATUSES.includes(donation.status)) {
      throw new BadRequestException(
        `Donation cannot be cancelled while in status ${donation.status}`,
      );
    }

    // Pending requests on a cancelled donation can never be fulfilled —
    // close them too so requesters aren't left waiting forever.
    const pending = await this.prisma.donationRequest.findMany({
      where: { donationId: id, status: DonationRequestStatus.PENDING },
      select: { requesterId: true },
    });
    const [updated] = await this.prisma.$transaction([
      this.prisma.donation.update({
        where: { id },
        data: { status: DonationStatus.CANCELLED },
      }),
      this.prisma.donationRequest.updateMany({
        where: { donationId: id, status: DonationRequestStatus.PENDING },
        data: { status: DonationRequestStatus.REJECTED },
      }),
    ]);

    for (const request of pending) {
      await this.notifications.create(
        request.requesterId,
        NotificationType.REQUEST_REJECTED,
        "So'rovingiz rad etildi",
        `"${donation.title}" xayriyasi egasi tomonidan bekor qilindi.`,
      );
    }

    return updated;
  }

  // --- Admin moderation ---

  async approve(id: string) {
    const donation = await this.findOrFail(id);
    if (donation.status !== DonationStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending donations can be approved');
    }

    const updated = await this.prisma.donation.update({
      where: { id },
      data: { status: DonationStatus.AVAILABLE, rejectionReason: null },
    });

    await this.notifications.create(
      donation.donorId,
      NotificationType.DONATION_APPROVED,
      'Xayriya tasdiqlandi',
      'Xayriyangiz tasdiqlandi va endi saytda mavjud.',
    );

    return updated;
  }

  async reject(id: string, reason: string) {
    const donation = await this.findOrFail(id);
    if (donation.status !== DonationStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending donations can be rejected');
    }

    const updated = await this.prisma.donation.update({
      where: { id },
      data: { status: DonationStatus.REJECTED, rejectionReason: reason },
    });

    await this.notifications.create(
      donation.donorId,
      NotificationType.DONATION_REJECTED,
      'Xayriya rad etildi',
      `Xayriyangiz rad etildi. Sababi: ${reason}`,
    );

    return updated;
  }

  // --- internal helpers ---

  async findOrFail(id: string) {
    const donation = await this.prisma.donation.findUnique({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  private async getOwnedOrFail(id: string, donorId: string) {
    const donation = await this.findOrFail(id);
    if (donation.donorId !== donorId) {
      throw new ForbiddenException('You do not own this donation');
    }
    return donation;
  }
}
