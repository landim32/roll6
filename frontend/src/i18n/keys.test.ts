import { describe, expect, it } from 'vitest';
import ptBR from './locales/pt-BR.json';

/** Every source file of the app, as text (Vite loads them at test time). */
const sources = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const has = (key: string): boolean => {
  let node: unknown = ptBR;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    const record = node as Record<string, unknown>;
    // i18next plurals: "key" may live as "key_one" / "key_other".
    node = part in record ? record[part] : record[`${part}_other`] ?? record[`${part}_one`];
  }
  return typeof node === 'string';
};

describe('i18n keys', () => {
  it('every literal t("…") key used by the app exists in pt-BR.json', () => {
    const missing = new Set<string>();
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'/g)) {
        if (!has(match[1])) missing.add(`${match[1]}  (${file})`);
      }
    }
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect([...missing]).toEqual([]);
  });
});
