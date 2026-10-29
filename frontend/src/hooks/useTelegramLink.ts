import { useCallback, useEffect, useState } from 'react';
import { usersService } from '../services/users.service';

// Link tokens live 10 minutes on the server; fetch a fresh one a bit sooner.
const REFRESH_MS = 8 * 60 * 1000;

// Prepares the one-time "connect Telegram" deep link ahead of time, so the
// button can be a plain <a href> that always opens the bot with the token —
// no popup that a browser might block. Shared by the profile page and the
// home page's "my account" panel.
export function useTelegramLink(enabled: boolean) {
  const [href, setHref] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(() => {
    usersService
      .createTelegramLink()
      .then((result) => {
        setHref(result.deepLink);
        setUnavailable(!result.deepLink);
      })
      .catch(() => setUnavailable(true));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { href, unavailable, refresh };
}
