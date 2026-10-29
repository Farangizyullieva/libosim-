import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const REGISTRY_PATH = join(process.cwd(), 'data', 'error-notifier-chats.json');
// Collapses a burst of identical errors (e.g. a bad request hit in a retry
// loop) into a single Telegram message instead of flooding the chat.
const DEDUPE_WINDOW_MS = 60_000;

@Injectable()
export class ErrorNotifierService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorNotifierService.name);
  private bot?: TelegramBot;
  private chatIds = new Set<string>();
  private readonly recentSignatures = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('errorNotifier.botToken');
    if (!token) {
      this.logger.warn(
        'Error-reporting bot disabled (set ERROR_BOT in .env to activate)',
      );
      return;
    }

    this.loadRegisteredChats();

    this.bot = new TelegramBot(token, { polling: true });
    // Deliberately not wired back through report() — a failure in this
    // bot's own polling must never recurse into trying to notify itself.
    this.bot.on('polling_error', (err) =>
      this.logger.error(`Error-notifier bot polling error: ${err.message}`),
    );
    this.bot.onText(/^\/start/, (msg) => this.registerChat(msg.chat.id));

    this.logger.log('Error-reporting bot started (polling)');
  }

  onModuleDestroy() {
    this.bot?.stopPolling();
  }

  // Fire-and-forget by design — reporting an error must never itself throw
  // or block the request that triggered it.
  report(error: unknown, context?: string) {
    if (!this.bot || this.chatIds.size === 0) return;

    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const signature = `${context ?? ''}:${name}:${message}`;
    const now = Date.now();
    const lastSent = this.recentSignatures.get(signature);
    if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) return;
    this.recentSignatures.set(signature, now);

    const label = this.config.get<string>('errorNotifier.name') ?? 'error';
    const lines = [
      `\u{1F6A8} [${label}] ${name}`,
      context ? `Context: ${context}` : undefined,
      message,
      stack ? '```\n' + stack.slice(0, 1500) + '\n```' : undefined,
    ].filter(Boolean);
    const text = lines.join('\n\n');

    for (const chatId of this.chatIds) {
      this.bot
        .sendMessage(chatId, text, { parse_mode: 'Markdown' })
        // Markdown in a stack trace can contain characters that break
        // Telegram's parser — retry once as plain text rather than lose
        // the report entirely.
        .catch(() =>
          this.bot?.sendMessage(chatId, text).catch((err) =>
            this.logger.error(`Failed to deliver error report: ${err.message}`),
          ),
        );
    }
  }

  // Stack traces must not go to whoever finds the bot. With ERROR_CHAT_IDS
  // set, only those chats may subscribe; without it, the first chat to
  // /start claims the bot and every later stranger is refused.
  private isAllowedChat(chatId: string): boolean {
    const allowed = this.config.get<string[]>('errorNotifier.chatIds') ?? [];
    if (allowed.length > 0) return allowed.includes(chatId);
    return this.chatIds.size === 0 || this.chatIds.has(chatId);
  }

  private registerChat(chatId: number) {
    if (!this.isAllowedChat(String(chatId))) {
      this.logger.warn(`Refused error-notifier subscription from chat ${chatId}`);
      this.bot?.sendMessage(chatId, "Bu bot faqat loyiha egasi uchun.");
      return;
    }
    this.chatIds.add(String(chatId));
    this.persistRegisteredChats();
    this.bot?.sendMessage(
      chatId,
      "Ulandi. Endi bu chatga backend'dagi kutilmagan xatoliklar haqida xabar kelib turadi.",
    );
  }

  private loadRegisteredChats() {
    try {
      if (!existsSync(REGISTRY_PATH)) return;
      const raw = readFileSync(REGISTRY_PATH, 'utf-8');
      const ids = JSON.parse(raw) as string[];
      const allowed = this.config.get<string[]>('errorNotifier.chatIds') ?? [];
      this.chatIds = new Set(
        allowed.length > 0 ? ids.filter((id) => allowed.includes(id)) : ids,
      );
    } catch (err) {
      this.logger.warn(`Could not load error-notifier chat registry: ${(err as Error).message}`);
    }
  }

  private persistRegisteredChats() {
    try {
      mkdirSync(join(process.cwd(), 'data'), { recursive: true });
      writeFileSync(REGISTRY_PATH, JSON.stringify([...this.chatIds]));
    } catch (err) {
      this.logger.warn(`Could not persist error-notifier chat registry: ${(err as Error).message}`);
    }
  }
}
