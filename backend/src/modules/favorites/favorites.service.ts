import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, donationId: string) {
    const donation = await this.prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) throw new NotFoundException('Donation not found');

    return this.prisma.favoriteDonation.upsert({
      where: { userId_donationId: { userId, donationId } },
      create: { userId, donationId },
      update: {},
    });
  }

  async remove(userId: string, donationId: string) {
    await this.prisma.favoriteDonation.deleteMany({ where: { userId, donationId } });
    return { removed: true };
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      this.prisma.favoriteDonation.findMany({
        where: { userId },
        include: { donation: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favoriteDonation.count({ where: { userId } }),
    ]);
    return {
      items: rows.map((f) => f.donation),
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }

  async listIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.favoriteDonation.findMany({
      where: { userId },
      select: { donationId: true },
    });
    return rows.map((r) => r.donationId);
  }
}
