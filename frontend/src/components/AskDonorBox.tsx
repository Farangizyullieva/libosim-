import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Send } from 'lucide-react';
import clsx from 'clsx';

const QUICK_KEYS = ['want', 'stillThere', 'size', 'condition', 'pickup'] as const;

// "Ask the donor" box: a prefilled message, one-tap quick questions and a
// round send button. Sending creates a donation request with the message
// as its note.
export function AskDonorBox({
  onSend,
  sent,
}: {
  onSend: (message: string) => Promise<void>;
  sent: boolean;
}) {
  const { t } = useTranslation();
  const greeting = t('ask.greeting');
  const [active, setActive] = useState<(typeof QUICK_KEYS)[number] | null>('want');
  const [message, setMessage] = useState(`${greeting} ${t('ask.quick.want')}`);
  const [sending, setSending] = useState(false);

  function pick(key: (typeof QUICK_KEYS)[number]) {
    setActive(key);
    setMessage(`${greeting} ${t(`ask.quick.${key}`)}`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await onSend(message.trim());
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-xl text-text sm:text-2xl">{t('ask.title')}</h2>

      {sent ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-accent">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t('contact.requestSent')}</p>
            <p className="mt-0.5 text-sm text-accent/80">{t('ask.sentHint')}</p>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
            <input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setActive(null);
              }}
              maxLength={500}
              aria-label={t('ask.title') ?? undefined}
              className="h-14 min-w-0 flex-1 rounded-2xl border border-border bg-surface-muted px-5 text-[15px] text-text"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              aria-label={t('contact.sendRequest') ?? undefined}
              className="tg-button flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {sending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send size={22} className="tg-plane" />
              )}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {QUICK_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => pick(key)}
                className={clsx(
                  'h-11 rounded-full px-5 text-[15px] font-medium transition-colors',
                  active === key
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-text hover:bg-accent-soft',
                )}
              >
                {t(`ask.quick.${key}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
