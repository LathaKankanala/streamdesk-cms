import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

const PALETTES = [
  ['#1e3a8a', '#7c3aed'],
  ['#0f766e', '#0369a1'],
  ['#9a3412', '#be123c'],
  ['#334155', '#0f172a'],
  ['#4d7c0f', '#0f766e'],
  ['#6d28d9', '#db2777'],
  ['#b45309', '#9a3412'],
];

/** Thumbnail with a generated gradient fallback when no image URL is set or it fails to load. */
@Component({
  selector: 'app-poster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src() && !failed()) {
      <img [src]="src()" [alt]="title()" (error)="failed.set(true)" loading="lazy" />
    } @else {
      <span class="fallback" [style.background]="gradient()" aria-hidden="true">{{ initials() }}</span>
    }
  `,
  styles: `
    :host { display: block; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: var(--surface-2); }
    img, .fallback { width: 100%; height: 100%; }
    img { object-fit: cover; display: block; }
    .fallback { display: grid; place-items: center; color: #fff; font-weight: 700; letter-spacing: .04em; font-size: .8em; }
  `,
})
export class Poster {
  readonly title = input.required<string>();
  readonly src = input<string>('');
  /** Resets whenever the image source changes. */
  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });

  protected readonly initials = computed(() =>
    this.title()
      .split(/\s+/)
      .filter((w) => /^[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected readonly gradient = computed(() => {
    const hash = [...this.title()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const [a, b] = PALETTES[hash % PALETTES.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  });
}
