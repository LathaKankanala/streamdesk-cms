import { DEFAULT_QUERY } from '../models/content.model';
import { MockDb, computeStats, queryContents } from './mock-db';
import { buildSeed } from './seed';

describe('queryContents', () => {
  const rows = buildSeed();

  it('paginates and reports the filtered total', () => {
    const page = queryContents(rows, { ...DEFAULT_QUERY, pageSize: 5, page: 2 });
    expect(page.items.length).toBe(5);
    expect(page.total).toBe(rows.length);
  });

  it('searches titles case-insensitively', () => {
    const page = queryContents(rows, { ...DEFAULT_QUERY, q: 'neon harbour' });
    expect(page.items.every((r) => r.title.toLowerCase().includes('neon harbour'))).toBe(true);
    expect(page.total).toBe(3);
  });

  it('combines type and status filters', () => {
    const page = queryContents(rows, { ...DEFAULT_QUERY, type: 'Live Channel', status: 'Published', pageSize: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((r) => r.type === 'Live Channel' && r.status === 'Published')).toBe(true);
  });

  it('sorts by title ascending', () => {
    const titles = queryContents(rows, { ...DEFAULT_QUERY, sort: 'title', order: 'asc', pageSize: 50 }).items.map((r) => r.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('computes dashboard stats', () => {
    const stats = computeStats(rows);
    const byStatusTotal = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
    expect(byStatusTotal).toBe(rows.length);
    expect(stats.recentlyUpdated.length).toBe(5);
  });
});

describe('MockDb', () => {
  it('creates, detects duplicate titles, updates and deletes', () => {
    const db = new MockDb(null);
    const { id: _id, updatedAt: _u, ...payload } = buildSeed()[0];
    const created = db.create({ ...payload, title: 'Brand New Title' });

    expect(db.titleExists('brand new title')).toBe(true);
    expect(db.titleExists('Brand New Title', created.id)).toBe(false);

    db.update(created.id, { ...payload, title: 'Renamed' });
    expect(db.get(created.id)?.title).toBe('Renamed');

    expect(db.delete([created.id])).toBe(1);
    expect(db.get(created.id)).toBeUndefined();
  });
});
