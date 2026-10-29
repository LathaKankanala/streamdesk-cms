import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  Content,
  ContentPayload,
  ContentQuery,
  DashboardStats,
  LANGUAGES,
  Page,
} from '../models/content.model';
import { buildSeed } from './seed';

const STORAGE_KEY = 'streamdesk.contents.v1';

/**
 * Tiny persistence layer behind the demo REST API. Data lives in localStorage so
 * edits survive a page refresh; it falls back to memory when storage is unavailable.
 */
export class MockDb {
  private rows: Content[];

  constructor(private readonly storage: Storage | null = safeLocalStorage()) {
    this.rows = this.load() ?? buildSeed();
  }

  query(q: ContentQuery): Page<Content> {
    return queryContents(this.rows, q);
  }

  get(id: number): Content | undefined {
    return this.rows.find((r) => r.id === id);
  }

  titleExists(title: string, excludeId?: number): boolean {
    const t = title.trim().toLowerCase();
    return this.rows.some((r) => r.id !== excludeId && r.title.toLowerCase() === t);
  }

  create(payload: ContentPayload): Content {
    const id = Math.max(0, ...this.rows.map((r) => r.id)) + 1;
    const row: Content = { ...payload, id, updatedAt: new Date().toISOString() };
    this.rows = [row, ...this.rows];
    this.save();
    return row;
  }

  update(id: number, payload: ContentPayload): Content | undefined {
    if (!this.get(id)) return undefined;
    const row: Content = { ...payload, id, updatedAt: new Date().toISOString() };
    this.rows = this.rows.map((r) => (r.id === id ? row : r));
    this.save();
    return row;
  }

  delete(ids: number[]): number {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !ids.includes(r.id));
    this.save();
    return before - this.rows.length;
  }

  stats(): DashboardStats {
    return computeStats(this.rows);
  }

  reset(): void {
    this.rows = buildSeed();
    this.save();
  }

  private load(): Content[] | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Content[]) : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.rows));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }
}

export function queryContents(rows: Content[], q: ContentQuery): Page<Content> {
  const term = q.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!term ||
        r.title.toLowerCase().includes(term) ||
        r.genre.toLowerCase().includes(term) ||
        r.tags.some((t) => t.includes(term)) ||
        r.translations.some((t) => t.title.toLowerCase().includes(term))) &&
      (!q.type || r.type === q.type) &&
      (!q.status || r.status === q.status) &&
      (!q.language || r.primaryLanguage === q.language || r.translations.some((t) => t.language === q.language)),
  );

  const dir = q.order === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => String(a[q.sort]).localeCompare(String(b[q.sort])) * dir);

  const start = (q.page - 1) * q.pageSize;
  return { items: sorted.slice(start, start + q.pageSize), total: filtered.length };
}

export function computeStats(rows: Content[]): DashboardStats {
  const count = <K extends string>(keys: readonly K[], pick: (r: Content) => K) =>
    Object.fromEntries(keys.map((k) => [k, rows.filter((r) => pick(r) === k).length])) as Record<K, number>;

  return {
    total: rows.length,
    byStatus: count(CONTENT_STATUSES, (r) => r.status),
    byType: count(CONTENT_TYPES, (r) => r.type),
    byLanguage: LANGUAGES.map((language) => ({
      language,
      count: rows.filter((r) => r.primaryLanguage === language).length,
    }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count),
    recentlyUpdated: [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
