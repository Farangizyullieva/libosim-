import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { slugify } from '../../common/helpers/slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Category already exists');

    return this.prisma.category.create({ data: { name: dto.name, slug } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOrFail(id);

    if (dto.name) {
      const slug = slugify(dto.name);
      const existing = await this.prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Category name already in use');

      return this.prisma.category.update({
        where: { id },
        data: { name: dto.name, slug },
      });
    }

    return this.prisma.category.findUnique({ where: { id } });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    // Donations reference their category with a required FK, so deleting a
    // category still in use would otherwise surface as a raw 500.
    const inUse = await this.prisma.donation.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Category is used by ${inUse} donation(s) and cannot be deleted`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  private async findOrFail(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
