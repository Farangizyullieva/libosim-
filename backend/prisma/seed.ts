/* eslint-disable no-console */
import {
  PrismaClient,
  DonationCondition,
  DonationGender,
  DonationAgeGroup,
  DonationStatus,
  DonationRequestStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

// Temporary demo photos, in priority order:
//  1. A real per-item product photo (uploads/demo-item-<prefix>.jpg) —
//     free-license (Pexels) stock photos fetched once per clothing type,
//     e.g. "jacket-1" -> demo-item-jacket.jpg. Much closer to what an
//     actual listing looks like than an illustration or gradient.
//  2. The frontend's per-category illustration (used for category badges).
//  3. The generated SVG placeholder below, if neither file is present
//     (e.g. backend deployed standalone without these fetched assets).
// None of these are real donation photos — actual uploads go through the
// real /uploads/images endpoint and always take priority over this file.
const CATEGORY_DEMO_DIR = join(process.cwd(), '..', 'frontend', 'src', 'assets', 'categories');

function itemDemoImage(seed: string): string | null {
  const prefix = seed.replace(/-\d+$/, '');
  const filename = `demo-item-${prefix}.jpg`;
  if (!existsSync(join(UPLOAD_DIR, filename))) return null;
  return `/uploads/${filename}`;
}

function categoryDemoImage(categorySlug: string): string | null {
  const srcPath = join(CATEGORY_DEMO_DIR, `${categorySlug}.png`);
  if (!existsSync(srcPath)) return null;

  const filename = `category-demo-${categorySlug}.png`;
  const destPath = join(UPLOAD_DIR, filename);
  if (!existsSync(destPath)) copyFileSync(srcPath, destPath);
  return `/uploads/${filename}`;
}

// Generated locally as SVG files served from this backend's own /uploads
// static route — no dependency on an external image CDN, which may be
// slow, blocked, or unreachable on some networks.
const UPLOAD_DIR = join(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// Warm gradient pairs matching the app's brand palette (see frontend
// index.css) — used with a soft clothing-silhouette watermark below,
// instead of a flat color rectangle with a plain text label, so the demo
// data at least looks like an intentional placeholder rather than a
// broken image. These are always placeholders, never real donation
// photos — actual uploads go through the real /uploads/images endpoint.
const GRADIENT_PAIRS: Array<[string, string]> = [
  ['#f6e3c4', '#eecd93'], // marigold
  ['#e3e7d6', '#c9d3b3'], // sage
  ['#f3dcd7', '#e6bdb3'], // dusty rose
  ['#eedcc6', '#dfbd8f'], // clay
  ['#dbe4e3', '#b9cbc9'], // muted teal
];

function hashToIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % mod;
}

function img(seed: string, label: string, categorySlug: string, w = 600, h = 750): string {
  const itemDemo = itemDemoImage(seed);
  if (itemDemo) return itemDemo;

  const demo = categoryDemoImage(categorySlug);
  if (demo) return demo;

  const filename = `seed-${seed}.svg`;
  const filepath = join(UPLOAD_DIR, filename);

  // Always (re)write — this is placeholder-only content (never a real
  // user upload, which gets a different, multer-generated filename), so
  // there's no risk of clobbering real data, and it means re-running the
  // seed after an update to this generator actually picks up the change
  // instead of leaving stale placeholder files behind.
  {
    const [from, to] = GRADIENT_PAIRS[hashToIndex(seed, GRADIENT_PAIRS.length)];
    const gid = `g-${seed}`;
    // A simple shirt-on-a-hanger silhouette, centered and scaled up, drawn
    // as a soft translucent watermark rather than photo content.
    const cx = w / 2;
    const cy = h / 2 - 20;
    const s = Math.min(w, h) / 260;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${gid})"/>
  <g transform="translate(${cx} ${cy}) scale(${s})" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 -58 A10 10 0 0 1 10 -48 L 48 -30 L 40 -14 L 26 -22 L 26 60 L -26 60 L -26 -22 L -40 -14 L -48 -30 L -10 -48 A10 10 0 0 1 0 -58 Z"/>
    <path d="M-10 -48 Q0 -38 10 -48"/>
  </g>
  <rect x="0" y="${h - 56}" width="${w}" height="56" fill="#1f2a44" fill-opacity="0.28"/>
  <text x="24" y="${h - 22}" font-family="Georgia, serif" font-size="26" fill="#ffffff">${label}</text>
</svg>`;
    writeFileSync(filepath, svg, 'utf-8');
  }

  return `/uploads/${filename}`;
}

async function main() {
  console.log('Seeding categories...');
  const categoryDefs = [
    { name: "Men's clothing", slug: 'mens-clothing' },
    { name: "Women's clothing", slug: 'womens-clothing' },
    { name: "Children's clothing", slug: 'childrens-clothing' },
    { name: 'Shoes', slug: 'shoes' },
    { name: 'Jackets', slug: 'jackets' },
    { name: 'Dresses', slug: 'dresses' },
    { name: 'Sweaters', slug: 'sweaters' },
    { name: 'Sportswear', slug: 'sportswear' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Other', slug: 'other' },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    categoryIds[cat.slug] = category.id;
  }

  console.log('Seeding test users...');
  const passwordHash = await bcrypt.hash('Test1234!', 12);

  async function upsertUser(fullName: string, phone: string, role: UserRole) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { fullName },
      create: { fullName, phone, passwordHash, role },
    });
    return user.id;
  }

  const adminId = await upsertUser('Test Admin', '+998900000001', UserRole.admin);
  const donor1Id = await upsertUser('Aziza Karimova', '+998900000002', UserRole.user);
  const donor2Id = await upsertUser('Jasur Toshmatov', '+998900000003', UserRole.user);
  const donor3Id = await upsertUser('Malika Yusupova', '+998900000004', UserRole.user);

  console.log('Test accounts (password for all: Test1234!):');
  console.log('  admin   +998900000001');
  console.log('  donor 1 +998900000002 (Aziza Karimova)');
  console.log('  donor 2 +998900000003 (Jasur Toshmatov)');
  console.log('  donor 3 +998900000004 (Malika Yusupova)');

  console.log('Seeding sample donations...');
  const donationDefs = [
    {
      donorId: donor1Id,
      title: 'Warm winter jacket, barely worn',
      description:
        'A cozy padded winter jacket, worn for only one season. No stains, zippers work perfectly. Great for the coming cold months.',
      categorySlug: 'jackets',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('jacket-1', 'Kurtka', 'jackets'), img('jacket-2', 'Kurtka 2', 'jackets')],
      location: 'Tashkent, Chilonzor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Kids sneakers, size 30',
      description:
        'My son outgrew these quickly. Good condition, some minor scuffing on the toe but plenty of life left.',
      categorySlug: 'shoes',
      size: '30',
      condition: DonationCondition.GOOD,
      gender: DonationGender.KIDS,
      ageGroup: DonationAgeGroup.CHILD,
      quantity: 1,
      images: [img('sneakers-1', 'Krossovka', 'shoes')],
      location: 'Tashkent, Yunusobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: "Men's formal shirts (set of 3)",
      description:
        'Three collared shirts, size L. Ironed and ready to wear. Good for job interviews or office wear.',
      categorySlug: 'mens-clothing',
      size: 'L',
      condition: DonationCondition.GOOD,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 3,
      images: [img('shirts-1', 'Koylak', 'mens-clothing'), img('shirts-2', 'Koylak 2', 'mens-clothing')],
      location: 'Tashkent, Mirzo Ulugbek',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Summer dress, floral pattern',
      description:
        'Light cotton summer dress, worn a handful of times. No damage, freshly washed.',
      categorySlug: 'dresses',
      size: 'S',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('dress-1', 'Koylak', 'dresses')],
      location: 'Tashkent, Yakkasaroy',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Wool scarf and gloves set',
      description: 'Matching wool scarf and gloves, warm and soft, used one winter.',
      categorySlug: 'accessories',
      size: null,
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('scarf-1', 'Sharf', 'accessories')],
      location: 'Tashkent, Shayxontohur',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Baby onesies, 0-6 months (bundle)',
      description:
        'A bundle of 5 baby onesies, gently used, all washed and in good condition.',
      categorySlug: 'childrens-clothing',
      size: '0-6m',
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.INFANT,
      quantity: 5,
      images: [img('onesie-1', 'Chaqaloq kiyimi', 'childrens-clothing'), img('onesie-2', 'Chaqaloq kiyimi 2', 'childrens-clothing')],
      location: 'Tashkent, Sergeli',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Chunky knit sweater, oatmeal color',
      description:
        'Soft oversized knit sweater, worn a few times last winter. No pilling, no snags.',
      categorySlug: 'sweaters',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('sweater-1', 'Sviter', 'sweaters')],
      location: 'Tashkent, Yashnobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Running shorts and tank top set',
      description:
        'Lightweight gym set, used for a few months of running. Machine washed, no damage.',
      categorySlug: 'sportswear',
      size: 'M',
      condition: DonationCondition.GOOD,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('sportswear-1', 'Sport kiyimi', 'sportswear')],
      location: 'Tashkent, Olmazor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: "Teen boy's jeans, size 14",
      description: 'Slim-fit jeans, a bit short for my son now but otherwise in great shape.',
      categorySlug: 'childrens-clothing',
      size: '14',
      condition: DonationCondition.GOOD,
      gender: DonationGender.KIDS,
      ageGroup: DonationAgeGroup.TEEN,
      quantity: 1,
      images: [img('jeans-1', 'Jinsi shim', 'childrens-clothing')],
      location: 'Tashkent, Bektemir',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Leather handbag, dark brown',
      description: 'Classic structured handbag, gently used, interior lining is clean.',
      categorySlug: 'accessories',
      size: null,
      condition: DonationCondition.GOOD,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('handbag-1', 'Sumka', 'accessories')],
      location: 'Tashkent, Chilonzor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Assorted winter hats and mittens',
      description: 'A mixed box of hats and mittens in various sizes, all clean and warm.',
      categorySlug: 'other',
      size: null,
      condition: DonationCondition.USED,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.CHILD,
      quantity: 6,
      images: [img('hats-1', 'Bosh kiyim', 'other')],
      location: 'Tashkent, Mirzo Ulugbek',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: "Women's floral blouse, size M",
      description: 'Lightweight blouse, worn a handful of times, no stains or tears.',
      categorySlug: 'womens-clothing',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('blouse-1', 'Ko\u02bbylak', 'womens-clothing')],
      location: 'Tashkent, Chilonzor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: "Women's denim jacket, size S",
      description: 'Classic blue denim jacket, light wear, fits true to size.',
      categorySlug: 'womens-clothing',
      size: 'S',
      condition: DonationCondition.GOOD,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('womens-denim-1', 'Denim kurtka', 'womens-clothing')],
      location: 'Tashkent, Yakkasaroy',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Pleated midi skirt, mustard yellow',
      description: 'Worn only twice, no pilling, machine washable fabric.',
      categorySlug: 'womens-clothing',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('skirt-1', 'Yubka', 'womens-clothing')],
      location: 'Tashkent, Shayxontohur',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Padded ski jacket, unisex, size L',
      description: 'Waterproof shell, warm lining, used for two winters, still performs well.',
      categorySlug: 'jackets',
      size: 'L',
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('jacket-3', 'Kurtka 3', 'jackets')],
      location: 'Tashkent, Olmazor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Denim jacket, light wash, size M',
      description: 'Classic trucker jacket, a few seasons old, no rips or stains.',
      categorySlug: 'jackets',
      size: 'M',
      condition: DonationCondition.USED,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('jacket-4', 'Kurtka 4', 'jackets')],
      location: 'Tashkent, Bektemir',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Leather ankle boots, size 38',
      description: 'Genuine leather ankle boots, resoled once, still sturdy.',
      categorySlug: 'shoes',
      size: '38',
      condition: DonationCondition.GOOD,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('boots-1', 'Etik', 'shoes')],
      location: 'Tashkent, Yunusobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: "Men's running shoes, size 42",
      description: 'Lightly used running shoes, good grip left on the soles.',
      categorySlug: 'shoes',
      size: '42',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('running-shoes-1', 'Krossovka 2', 'shoes')],
      location: 'Tashkent, Mirzo Ulugbek',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: "Men's cotton t-shirts (set of 4)",
      description: 'Plain cotton tees, various colors, all in good shape.',
      categorySlug: 'mens-clothing',
      size: 'L',
      condition: DonationCondition.GOOD,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 4,
      images: [img('tshirts-1', 'Futbolka', 'mens-clothing')],
      location: 'Tashkent, Yashnobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: "Men's wool coat, size XL",
      description: 'Long wool coat, warm and formal, one small button replaced.',
      categorySlug: 'mens-clothing',
      size: 'XL',
      condition: DonationCondition.USED,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('coat-1', 'Palto', 'mens-clothing')],
      location: 'Tashkent, Sergeli',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Evening dress, emerald green',
      description: 'Worn once to a wedding, dry-cleaned and stored carefully since.',
      categorySlug: 'dresses',
      size: 'S',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('dress-2', 'Kechki koylak', 'dresses')],
      location: 'Tashkent, Chilonzor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Denim pinafore dress, size 8-9y',
      description: "Girl's denim pinafore dress, a couple of small marks, still cute.",
      categorySlug: 'dresses',
      size: '8-9y',
      condition: DonationCondition.GOOD,
      gender: DonationGender.KIDS,
      ageGroup: DonationAgeGroup.CHILD,
      quantity: 1,
      images: [img('dress-3', 'Bolalar koylagi', 'dresses')],
      location: 'Tashkent, Olmazor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Cable-knit cardigan, camel color',
      description: 'Button-front cardigan, soft wool blend, worn one season.',
      categorySlug: 'sweaters',
      size: 'L',
      condition: DonationCondition.GOOD,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('sweater-2', 'Sviter 2', 'sweaters')],
      location: 'Tashkent, Bektemir',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: "Men's crew neck pullover, navy",
      description: 'Simple cotton pullover, machine washed, no fading.',
      categorySlug: 'sweaters',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('sweater-3', 'Sviter 3', 'sweaters')],
      location: 'Tashkent, Yunusobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Yoga leggings and sports bra set',
      description: 'High-waisted leggings with matching sports bra, light use.',
      categorySlug: 'sportswear',
      size: 'S',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('sportswear-2', 'Sport kiyimi 2', 'sportswear')],
      location: 'Tashkent, Mirzo Ulugbek',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Football boots, size 39',
      description: 'Firm-ground football boots, used for one season of training.',
      categorySlug: 'sportswear',
      size: '39',
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.TEEN,
      quantity: 1,
      images: [img('football-boots-1', 'Futbol krossovkasi', 'sportswear')],
      location: 'Tashkent, Yashnobod',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Kids clothing bundle, 3-4 years',
      description: 'Mixed bundle of shirts, shorts and pajamas, all clean.',
      categorySlug: 'childrens-clothing',
      size: '3-4y',
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.CHILD,
      quantity: 8,
      images: [img('kids-bundle-1', 'Bolalar kiyimi', 'childrens-clothing')],
      location: 'Tashkent, Sergeli',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Silk scarf, printed pattern',
      description: 'Lightweight silk scarf, worn a few times, no snags.',
      categorySlug: 'accessories',
      size: null,
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.WOMEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('scarf-2', 'Ro\u02bbmol', 'accessories')],
      location: 'Tashkent, Yakkasaroy',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor1Id,
      title: 'Leather belt, brown, size M',
      description: 'Genuine leather belt, barely worn, classic buckle.',
      categorySlug: 'accessories',
      size: 'M',
      condition: DonationCondition.LIKE_NEW,
      gender: DonationGender.MEN,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('belt-1', 'Kamar', 'accessories')],
      location: 'Tashkent, Chilonzor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor2Id,
      title: 'Assorted fabric remnants and buttons',
      description: 'A box of leftover fabric pieces and buttons, useful for small projects.',
      categorySlug: 'other',
      size: null,
      condition: DonationCondition.USED,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 1,
      images: [img('remnants-1', 'Mato qoldiqlari', 'other')],
      location: 'Tashkent, Olmazor',
      status: DonationStatus.AVAILABLE,
    },
    {
      donorId: donor3Id,
      title: 'Umbrellas (set of 2), lightly used',
      description: 'Two compact umbrellas, both still open and close properly.',
      categorySlug: 'other',
      size: null,
      condition: DonationCondition.GOOD,
      gender: DonationGender.UNISEX,
      ageGroup: DonationAgeGroup.ADULT,
      quantity: 2,
      images: [img('umbrellas-1', 'Zontik', 'other')],
      location: 'Tashkent, Bektemir',
      status: DonationStatus.PENDING_REVIEW,
    },
  ];

  const donationIds: Record<string, string> = {};
  for (const d of donationDefs) {
    const existing = await prisma.donation.findFirst({
      where: { title: d.title, donorId: d.donorId },
    });
    if (existing) {
      donationIds[d.title] = existing.id;
      continue;
    }

    const created = await prisma.donation.create({
      data: {
        donorId: d.donorId,
        title: d.title,
        description: d.description,
        categoryId: categoryIds[d.categorySlug],
        size: d.size,
        condition: d.condition,
        gender: d.gender,
        ageGroup: d.ageGroup,
        quantity: d.quantity,
        images: d.images,
        location: d.location,
        status: d.status,
      },
    });
    donationIds[d.title] = created.id;
  }

  console.log('Seeding sample favorites...');
  const favoritePairs: Array<[string, string]> = [
    [donor2Id, 'Warm winter jacket, barely worn'],
    [donor2Id, 'Leather handbag, dark brown'],
    [donor3Id, 'Warm winter jacket, barely worn'],
    [donor1Id, 'Chunky knit sweater, oatmeal color'],
  ];
  for (const [userId, title] of favoritePairs) {
    const donationId = donationIds[title];
    if (!donationId) continue;
    await prisma.favoriteDonation.upsert({
      where: { userId_donationId: { userId, donationId } },
      update: {},
      create: { userId, donationId },
    });
  }

  console.log('Seeding sample donation requests...');
  // donor3 requests donor1's jacket (still PENDING — test the approve/reject
  // flow), donor2 requests donor3's sweater and it's already APPROVED (so
  // the donation should show as RESERVED and the donor can see their phone).
  const jacketId = donationIds['Warm winter jacket, barely worn'];
  const sweaterId = donationIds['Chunky knit sweater, oatmeal color'];

  if (jacketId) {
    const existing = await prisma.donationRequest.findFirst({
      where: { donationId: jacketId, requesterId: donor3Id },
    });
    if (!existing) {
      await prisma.donationRequest.create({
        data: {
          donationId: jacketId,
          requesterId: donor3Id,
          status: DonationRequestStatus.PENDING,
          note: 'Salom! Bu kurtka hali ham mavjudmi? Men olib ketishga tayyorman.',
        },
      });
    }
  }

  if (sweaterId) {
    const existing = await prisma.donationRequest.findFirst({
      where: { donationId: sweaterId, requesterId: donor2Id },
    });
    if (!existing) {
      await prisma.donationRequest.create({
        data: {
          donationId: sweaterId,
          requesterId: donor2Id,
          status: DonationRequestStatus.APPROVED,
          note: 'Menga juda kerak, rahmat!',
        },
      });
      await prisma.donation.update({
        where: { id: sweaterId },
        data: { status: DonationStatus.RESERVED },
      });
    }
  }

  console.log(`Done. Admin user id: ${adminId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
