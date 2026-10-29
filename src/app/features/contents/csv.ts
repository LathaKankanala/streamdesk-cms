import { Content } from '../../core/models/content.model';

const COLUMNS: [header: string, value: (c: Content) => string | number | null][] = [
  ['ID', (c) => c.id],
  ['Title', (c) => c.title],
  ['Type', (c) => c.type],
  ['Genre', (c) => c.genre],
  ['Primary Language', (c) => c.primaryLanguage],
  ['Other Languages', (c) => c.translations.map((t) => t.language).join('; ')],
  ['Status', (c) => c.status],
  ['Age Rating', (c) => c.ageRating],
  ['Release Date', (c) => c.releaseDate],
  ['Duration (min)', (c) => c.durationMinutes],
  ['Tags', (c) => c.tags.join('; ')],
  ['Updated At', (c) => c.updatedAt],
];

export function toCsv(rows: Content[]): string {
  const escape = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [COLUMNS.map(([h]) => h), ...rows.map((r) => COLUMNS.map(([, get]) => escape(get(r))))];
  // BOM so Excel opens non-ASCII titles correctly.
  return '﻿' + lines.map((l) => l.join(',')).join('\r\n');
}
