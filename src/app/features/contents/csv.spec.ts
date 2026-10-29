import { buildSeed } from '../../core/mock-api/seed';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header plus one line per row and escapes quotes and commas', () => {
    const [row] = buildSeed();
    const csv = toCsv([{ ...row, title: 'Hello, "World"' }]);
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[0].startsWith('ID,Title,Type')).toBe(true);
    expect(lines[1]).toContain('"Hello, ""World"""');
  });
});
