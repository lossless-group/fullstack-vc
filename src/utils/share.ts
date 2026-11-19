// Ported from sites/cathode-site/src/utils/share.ts (tokens remapped: no
// --color-surface-raised or --font-mono here).
// Share a URL the way the device expects: the native share sheet on touch
// devices (iMessage, WhatsApp, Slack...), a copied link on desktop. Falls back
// to selecting the URL when the clipboard is blocked.
export type ShareResult = 'shared' | 'copied' | 'selected' | 'cancelled';

export async function shareOrCopy(url: string, title?: string): Promise<ShareResult> {
  const touch = window.matchMedia?.('(hover: none)').matches;
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Otherwise fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    const tmp = document.createElement('span');
    tmp.textContent = url;
    tmp.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(tmp);
    const range = document.createRange();
    range.selectNodeContents(tmp);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    setTimeout(() => tmp.remove(), 4000);
    return 'selected';
  }
}

export const resultLabel: Record<ShareResult, string> = {
  shared: 'Shared',
  copied: 'Link copied',
  selected: 'Press ⌘C to copy',
  cancelled: '',
};

// A toast confirming what was shared: "Link copied", the section or page
// title, and the link itself. Without it a desktop copy looks like nothing
// happened. The native share sheet is its own feedback, so 'shared' and
// 'cancelled' show nothing.
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showShareToast(result: ShareResult, url: string, title?: string) {
  if (result === 'shared' || result === 'cancelled') return;
  if (!document.getElementById('share-toast-style')) {
    const style = document.createElement('style');
    style.id = 'share-toast-style';
    style.textContent = `
      .share-toast {
        position: fixed; left: 50%; bottom: 1.5rem; z-index: 1000;
        transform: translate(-50%, 0.75rem); opacity: 0;
        width: min(28rem, calc(100vw - 2rem));
        display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.75rem; align-items: start;
        padding: 0.85rem 1rem; border-radius: 0.75rem;
        background: var(--color-surface); color: var(--color-text);
        border: 1px solid var(--color-border);
        box-shadow: 0 18px 40px -16px rgb(0 0 0 / 0.45);
        font-family: var(--font-body); pointer-events: none;
        transition: opacity 160ms ease, transform 160ms ease;
      }
      .share-toast.is-on { opacity: 1; transform: translate(-50%, 0); }
      .share-toast__check {
        grid-row: span 3; width: 1.6rem; height: 1.6rem; border-radius: 50%;
        display: grid; place-items: center; margin-top: 0.1rem;
        background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary);
      }
      .share-toast__check svg { width: 0.95rem; height: 0.95rem; }
      .share-toast__status { font-family: var(--font-code); font-size: 0.75rem; color: var(--color-primary); }
      .share-toast__title { font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
      .share-toast__url {
        font-family: var(--font-code); font-size: 0.72rem; color: var(--color-text-muted);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) { .share-toast { transition: none; } }
    `;
    document.head.appendChild(style);
  }

  let el = document.getElementById('share-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'share-toast';
    el.className = 'share-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <span class="share-toast__check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
    </span>
    <span class="share-toast__status"></span>
    <span class="share-toast__title"></span>
    <span class="share-toast__url"></span>`;
  el.querySelector('.share-toast__status')!.textContent = resultLabel[result];
  el.querySelector('.share-toast__title')!.textContent = title ?? document.title;
  el.querySelector('.share-toast__url')!.textContent = url.replace(/^https?:\/\//, '');

  requestAnimationFrame(() => el!.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('is-on'), 3200);
}
