import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      blockedUsers,
      totalDonations,
      pendingDonations,
      availableDonations,
      totalCategories,
      totalRequests,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.donation.count(),
      this.prisma.donation.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.donation.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.category.count(),
      this.prisma.donationRequest.count(),
      this.prisma.donationRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      blockedUsers,
      totalDonations,
      pendingDonations,
      availableDonations,
      totalCategories,
      totalRequests,
      pendingRequests,
    };
  }
}
