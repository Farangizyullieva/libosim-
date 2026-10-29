import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import {
  DonationAgeGroup,
  DonationCondition,
  DonationGender,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DonationsService } from '../donations/donations.service';
import { CategoriesService } from '../categories/categories.service';
import { ErrorNotifierService } from '../../common/error-notifier/error-notifier.service';

type WizardStep =
  | 'category'
  | 'condition'
  | 'gender'
  | 'ageGroup'
  | 'title'
  | 'description'
  | 'location'
  | 'quantity'
  | 'confirm';

interface WizardState {
  userId: string;
  step: WizardStep;
  photoFileId: string;
  categoryId?: string;
  condition?: DonationCondition;
  gender?: DonationGender;
  ageGroup?: DonationAgeGroup;
  title?: string;
  description?: string;
  location?: string;
  quantity?: number;
}

const LINK_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONDITION_LABELS: Record<DonationCondition, string> = {
  NEW: 'Yangi',
  LIKE_NEW: 'Yangidek',
  GOOD: 'Yaxshi',
  USED: 'Ishlatilgan',
};

const GENDER_LABELS: Record<DonationGender, string> = {
  MEN: 'Erkaklar',
  WOMEN: 'Ayollar',
  UNISEX: 'Universal',
  KIDS: 'Bolalar',
};

const AGE_GROUP_LABELS: Record<DonationAgeGroup, string> = {
  ADULT: 'Kattalar',
  TEEN: "O'smirlar",
  CHILD: 'Bolalar',
  INFANT: 'Chaqaloqlar',
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private readonly wizards = new Map<number, WizardState>();
  private readonly uploadDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly donationsService: DonationsService,
    private readonly categoriesService: CategoriesService,
    private readonly errorNotifier: ErrorNotifierService,
  ) {
    this.uploadDir = join(process.cwd(), this.config.get<string>('uploads.dir') ?? 'uploads');
  }

  onModuleInit() {
    const enabled = this.config.get<boolean>('telegram.enabled');
    const token = this.config.get<string>('telegram.botToken');

    if (!enabled || !token) {
      this.logger.warn(
        'Telegram bot disabled (set TELEGRAM_ENABLED=true and TELEGRAM_BOT_TOKEN to activate)',
      );
      return;
    }

    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });

    this.bot = new TelegramBot(token, { polling: true });
    this.bot.on('polling_error', (err) => {
      this.logger.error(`Polling error: ${err.message}`);
      this.errorNotifier.report(err, 'TelegramService polling');
    });

    this.bot.onText(/^\/start(?:\s+(\S+))?/, (msg, match) =>
      this.handleStart(msg, match?.[1]),
    );
    this.bot.onText(/^\/cancel/, (msg) => this.handleCancel(msg));
    this.bot.on('photo', (msg) => this.handlePhoto(msg));
    this.bot.on('location', (msg) => this.handleLocation(msg));
    this.bot.on('callback_query', (query) => this.handleCallback(query));
    this.bot.on('message', (msg) => {
      if (msg.text?.startsWith('/') || msg.photo || msg.location) return;
      this.handleText(msg);
    });

    this.logger.log('Telegram bot started (polling)');
  }

  onModuleDestroy() {
    this.bot?.stopPolling();
  }

  // --- Account linking ---

  private async handleStart(msg: Message, token?: string) {
    const chatId = msg.chat.id;

    // Account-link tokens are UUIDs. Anything else (e.g. "web" from the
    // site's "Open bot" button) is just a plain /start, not a bad link.
    if (!token || !LINK_TOKEN_RE.test(token)) {
      const linked = await this.prisma.user.findFirst({
        where: { telegramChatId: String(chatId) },
      });
      if (linked) {
        await this.send(chatId, `Salom, ${linked.fullName}! Xayriya qilish uchun menga kiyim rasmini yuboring.`);
      } else {
        await this.send(
          chatId,
          "Hisobingizni ulash uchun saytdagi profilingizga kiring va 'Telegramga ulash' tugmasini bosing.",
        );
      }
      return;
    }

    const linkToken = await this.prisma.telegramLinkToken.findUnique({ where: { token } });
    if (!linkToken || linkToken.used || linkToken.expiresAt < new Date()) {
      await this.send(chatId, 'Havola muddati o\'tgan yoki noto\'g\'ri. Profilingizdan qaytadan urinib ko\'ring.');
      return;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: linkToken.userId },
        data: { telegramChatId: String(chatId), telegramLinkedAt: new Date() },
      }),
      this.prisma.telegramLinkToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    await this.send(chatId, "Hisobingiz muvaffaqiyatli ulandi! Endi menga kiyim rasmini yuborsangiz, xayriya sifatida qo'sha olasiz.");
  }

  private handleCancel(msg: Message) {
    this.wizards.delete(msg.chat.id);
    return this.send(msg.chat.id, 'Bekor qilindi.');
  }

  // --- Donation submission wizard ---

  private async findLinkedUserId(chatId: number): Promise<string | null> {
    // Blocked users can't log in to the site, so they mustn't be able to
    // keep posting through the bot either.
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: String(chatId), isBlocked: false },
    });
    return user?.id ?? null;
  }

  private async handlePhoto(msg: Message) {
    const chatId = msg.chat.id;
    const userId = await this.findLinkedUserId(chatId);
    if (!userId) {
      await this.send(
        chatId,
        "Avval hisobingizni ulang: saytdagi profilingizga kiring va 'Telegramga ulash' tugmasini bosing.",
      );
      return;
    }

    const photo = msg.photo?.[msg.photo.length - 1];
    if (!photo) return;

    const categories = await this.categoriesService.findAll();
    if (categories.length === 0) {
      await this.send(chatId, 'Hozircha kategoriyalar mavjud emas. Birozdan so\'ng urinib ko\'ring.');
      return;
    }

    this.wizards.set(chatId, { userId, step: 'category', photoFileId: photo.file_id });

    await this.bot!.sendMessage(chatId, "Buyum qaysi kategoriyaga tegishli?", {
      reply_markup: {
        inline_keyboard: this.chunk(
          categories.map((c) => ({ text: c.name, callback_data: `cat:${c.id}` })),
          2,
        ),
      },
    });
  }

  private async handleCallback(query: CallbackQuery) {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    const wizard = this.wizards.get(chatId);
    if (!wizard) {
      await this.bot!.answerCallbackQuery(query.id);
      return;
    }

    const [kind, value] = (query.data ?? '').split(':');
    await this.bot!.answerCallbackQuery(query.id);

    if (kind === 'cat' && wizard.step === 'category') {
      wizard.categoryId = value;
      wizard.step = 'condition';
      await this.send(chatId, 'Buyum holati qanday?', this.enumKeyboard(CONDITION_LABELS, 'cond'));
      return;
    }

    if (kind === 'cond' && wizard.step === 'condition') {
      wizard.condition = value as DonationCondition;
      wizard.step = 'gender';
      await this.send(chatId, 'Kimlar uchun?', this.enumKeyboard(GENDER_LABELS, 'gender'));
      return;
    }

    if (kind === 'gender' && wizard.step === 'gender') {
      wizard.gender = value as DonationGender;
      wizard.step = 'ageGroup';
      await this.send(chatId, 'Yosh guruhi?', this.enumKeyboard(AGE_GROUP_LABELS, 'age'));
      return;
    }

    if (kind === 'age' && wizard.step === 'ageGroup') {
      wizard.ageGroup = value as DonationAgeGroup;
      wizard.step = 'title';
      await this.send(chatId, "Buyumga qisqa nom bering (masalan: \"Qishki kurtka\").");
      return;
    }

    if (kind === 'confirm') {
      if (value === 'yes') {
        await this.finalizeWizard(chatId, wizard);
      } else {
        this.wizards.delete(chatId);
        await this.send(chatId, 'Bekor qilindi.');
      }
    }
  }

  private async handleLocation(msg: Message) {
    const chatId = msg.chat.id;
    const wizard = this.wizards.get(chatId);
    if (!wizard || wizard.step !== 'location' || !msg.location) return;

    wizard.location = `${msg.location.latitude.toFixed(5)}, ${msg.location.longitude.toFixed(5)}`;
    wizard.step = 'quantity';
    await this.send(chatId, "Nechta dona? (raqam kiriting, masalan: 1)");
  }

  private async handleText(msg: Message) {
    const chatId = msg.chat.id;
    const wizard = this.wizards.get(chatId);
    if (!wizard) return;
    const text = (msg.text ?? '').trim();
    if (!text) return;

    switch (wizard.step) {
      case 'title':
        if (text.length < 3) {
          await this.send(chatId, 'Nomi kamida 3 ta belgidan iborat bo\'lishi kerak. Qayta kiriting:');
          return;
        }
        wizard.title = text;
        wizard.step = 'description';
        await this.send(chatId, "Buyum haqida qisqacha tavsif yozing (kamida 10 ta belgi).");
        return;

      case 'description':
        if (text.length < 10) {
          await this.send(chatId, 'Tavsif kamida 10 ta belgidan iborat bo\'lishi kerak. Qayta kiriting:');
          return;
        }
        wizard.description = text;
        wizard.step = 'location';
        await this.send(chatId, "Manzilingizni yuboring (joylashuv tugmasi orqali) yoki matn bilan yozing (masalan: Toshkent, Chilonzor).");
        return;

      case 'location':
        wizard.location = text;
        wizard.step = 'quantity';
        await this.send(chatId, "Nechta dona? (raqam kiriting, masalan: 1)");
        return;

      case 'quantity': {
        const quantity = parseInt(text, 10);
        if (!Number.isFinite(quantity) || quantity <= 0 || String(quantity) !== text) {
          await this.send(chatId, "Iltimos, musbat butun son kiriting (masalan: 1).");
          return;
        }
        wizard.quantity = quantity;
        wizard.step = 'confirm';
        await this.sendConfirmation(chatId, wizard);
        return;
      }

      default:
        return;
    }
  }

  private async sendConfirmation(chatId: number, wizard: WizardState) {
    const summary = [
      `Nomi: ${wizard.title}`,
      `Tavsif: ${wizard.description}`,
      `Holati: ${wizard.condition ? CONDITION_LABELS[wizard.condition] : '-'}`,
      `Kimlar uchun: ${wizard.gender ? GENDER_LABELS[wizard.gender] : '-'}`,
      `Yosh guruhi: ${wizard.ageGroup ? AGE_GROUP_LABELS[wizard.ageGroup] : '-'}`,
      `Manzil: ${wizard.location ?? '-'}`,
      `Miqdor: ${wizard.quantity ?? 1}`,
    ].join('\n');

    await this.send(chatId, `Tekshiring:\n\n${summary}\n\nYuborilsinmi?`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Ha, yuborish', callback_data: 'confirm:yes' },
            { text: '❌ Bekor qilish', callback_data: 'confirm:no' },
          ],
        ],
      },
    });
  }

  private async finalizeWizard(chatId: number, wizard: WizardState) {
    try {
      const imagePath = await this.downloadPhoto(wizard.photoFileId);

      const donation = await this.donationsService.create(wizard.userId, {
        title: wizard.title!,
        description: wizard.description!,
        categoryId: wizard.categoryId!,
        condition: wizard.condition!,
        gender: wizard.gender!,
        ageGroup: wizard.ageGroup!,
        quantity: wizard.quantity ?? 1,
        location: wizard.location,
        images: [imagePath],
      });

      await this.send(
        chatId,
        donation.status === 'PENDING_REVIEW'
          ? "Rahmat! Rasm avtomatik tekshiruvdan o'ta olmadi, shuning uchun admin ko'rib chiqqach saytda chiqadi."
          : "Rahmat! Xayriyangiz qabul qilindi va saytda darhol ko'rinadi.",
      );
    } catch (err) {
      this.logger.error(`Failed to create donation from Telegram: ${(err as Error).message}`);
      await this.send(chatId, 'Xatolik yuz berdi. Birozdan so\'ng qaytadan urinib ko\'ring.');
    } finally {
      this.wizards.delete(chatId);
    }
  }

  private async downloadPhoto(fileId: string): Promise<string> {
    const fileLink = await this.bot!.getFileLink(fileId);
    const response = await fetch(fileLink);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download Telegram photo: ${response.status}`);
    }

    const filename = `${randomUUID()}.jpg`;
    const filePath = join(this.uploadDir, filename);
    const buffer = Buffer.from(await response.arrayBuffer());

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      stream.write(buffer);
      stream.end();
    });

    return `/uploads/${filename}`;
  }

  // --- Helpers ---

  private enumKeyboard(labels: Record<string, string>, prefix: string) {
    const buttons = Object.entries(labels).map(([value, label]) => ({
      text: label,
      callback_data: `${prefix}:${value}`,
    }));
    return { reply_markup: { inline_keyboard: this.chunk(buttons, 2) } };
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
    return rows;
  }

  private async send(chatId: number, text: string, options?: TelegramBot.SendMessageOptions) {
    if (!this.bot) return;
    await this.bot.sendMessage(chatId, text, options);
  }
}
