import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send } from 'lucide-react';
import clsx from 'clsx';
import {
  donationRequestsService,
  type DonationRequestItem,
  type RequestMessage,
} from '../services/donation-requests.service';
import { extractErrorMessage } from '../services/api-client';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';

const CLOSED_STATUSES = ['REJECTED', 'CANCELLED', 'COMPLETED'];

// Chat between the requester and the donor about one request. The request's
// original note is shown as the first message.
export function RequestConversation({
  request,
  requesterName,
}: {
  request: DonationRequestItem;
  requesterName: string;
}) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user?.id);
  const push = useToastStore((s) => s.push);
  const [messages, setMessages] = useState<RequestMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const closed = CLOSED_STATUSES.includes(request.status);

  useEffect(() => {
    if (messages !== null) return;
    donationRequestsService
      .messages(request.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [messages, request.id]);

  useEffect(() => {
    // Scroll only the thread box, never the whole page.
    const box = endRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const message = await donationRequestsService.sendMessage(request.id, value);
      setMessages((prev) => [...(prev ?? []), message]);
      setText('');
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  }

  const bubbles: { id: string; mine: boolean; name: string; text: string; at: string }[] = [
    ...(request.note
      ? [
          {
            id: 'note',
            mine: request.requesterId === me,
            name: requesterName,
            text: request.note,
            at: request.createdAt,
          },
        ]
      : []),
    ...(messages ?? []).map((m) => ({
      id: m.id,
      mine: m.senderId === me,
      name: m.sender.fullName,
      text: m.text,
      at: m.createdAt,
    })),
  ];

  return (
    <div className="rounded-2xl border border-border bg-bg p-3">
      <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <MessageCircle size={13} />
        {t('chat.open')}
      </p>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto p-1">
        {messages === null ? (
          <p className="py-4 text-center text-sm text-text-muted">{t('common.loading')}</p>
        ) : bubbles.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">{t('chat.empty')}</p>
        ) : (
          bubbles.map((b) => (
            <div key={b.id} className={clsx('flex flex-col', b.mine ? 'items-end' : 'items-start')}>
              <div
                className={clsx(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                  b.mine
                    ? 'rounded-br-md bg-accent text-white'
                    : 'rounded-bl-md border border-border bg-surface text-text',
                )}
              >
                {!b.mine && <p className="mb-0.5 text-xs font-semibold text-accent">{b.name}</p>}
                <p className="whitespace-pre-line break-words">{b.text}</p>
              </div>
              <span className="mt-0.5 px-1 text-[11px] text-text-muted">
                {new Date(b.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {closed ? (
        <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-center text-sm text-text-muted">
          {t('chat.closed')}
        </p>
      ) : (
        <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={t('chat.placeholder') ?? ''}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-text"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label={t('chat.send') ?? undefined}
            className="tg-button flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Send size={18} className="tg-plane" />
          </button>
        </form>
      )}
    </div>
  );
}
