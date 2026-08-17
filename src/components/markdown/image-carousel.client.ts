/**
 * image-carousel.client.ts — progressive enhancement shared by the Stepper and
 * Peek variants (the two that ship a nav).
 *
 * Strictly additive. Without this the track is still a scrollable, snapping,
 * keyboard-focusable list and the dots still work as plain anchor links. This
 * only adds the live "Step N of M" readout, active-dot/active-slide state, and
 * arrow-key navigation.
 *
 * Filmstrip and ContactSheet never import it — they need no JS at all.
 */

export function initImageCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-lfm-carousel]').forEach((root) => {
    if (root.dataset.lfmReady) return;
    root.dataset.lfmReady = 'true';

    const track = root.querySelector<HTMLElement>('[data-track]');
    if (!track) return;

    const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
    const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
    const readout = root.querySelector('[data-readout]');
    const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-next]');
    const showsStepCount = root.dataset.variant === 'stepper';
    let index = 0;

    const paint = () => {
      slides.forEach((s, i) => s.toggleAttribute('data-active', i === index));
      dots.forEach((d, i) => d.toggleAttribute('data-active', i === index));
      if (readout && showsStepCount) {
        readout.textContent = `Step ${index + 1} of ${slides.length}`;
      }
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    };

    // Track whichever slide is nearest the centre of the scroll port.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.55) {
            const i = slides.indexOf(e.target as HTMLElement);
            if (i >= 0) {
              index = i;
              paint();
            }
          }
        });
      },
      { root: track, threshold: [0.55, 0.9] }
    );
    slides.forEach((s) => io.observe(s));

    const goTo = (i: number) => {
      index = Math.max(0, Math.min(slides.length - 1, i));
      slides[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      paint();
    };

    prev?.addEventListener('click', () => goTo(index - 1));
    next?.addEventListener('click', () => goTo(index + 1));
    dots.forEach((d, i) =>
      d.addEventListener('click', (ev) => {
        ev.preventDefault();
        goTo(i);
      })
    );

    track.addEventListener('keydown', (ev) => {
      const e = ev as KeyboardEvent;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(index + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(index - 1);
      }
    });

    paint();
  });
}

initImageCarousels();
document.addEventListener('astro:page-load', initImageCarousels);
