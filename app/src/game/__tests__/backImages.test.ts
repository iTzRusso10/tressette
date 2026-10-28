import { describe, expect, it } from 'vitest';

import { BACKS, NAPOLI_BACKS } from '@/meta/catalog';

// Il registro dei dorsi (backImages.ts) e i PNG li genera scripts/make-art.mjs: qui si controlla che
// corrispondano al catalogo senza caricare le immagini (il require dei PNG non funziona sotto Node).
type Fs = {
  readFileSync: (p: URL, enc: string) => string;
  existsSync: (p: URL) => boolean;
  readdirSync: (p: URL) => string[];
};
const fs = async () => {
  const mod = 'node:fs';
  return (await import(/* @vite-ignore */ mod)) as Fs;
};
const at = (path: string) => new URL(`../../../${path}`, import.meta.url);

const all = [...BACKS, ...NAPOLI_BACKS];
const ready = all.filter(b => b.status === 'ready').map(b => b.id);

describe('immagini dei dorsi', () => {
  it('ogni dorso pronto ha il suo require, e solo quelli; nessuno per i dorsi in arrivo', async () => {
    const registry = (await fs()).readFileSync(at('src/game/backImages.ts'), 'utf8');
    const found = [...registry.matchAll(/'([a-z0-9-]+)': require\('\.\.\/\.\.\/assets\/backs\/([a-z0-9-]+)\.png'\)/g)];
    expect(found.map(m => m[1]).sort()).toEqual([...ready].sort());
    for (const m of found) expect(m[2]).toBe(m[1]);
    for (const b of all.filter(i => i.status === 'coming')) expect(registry).not.toContain(`'${b.id}'`);
  });

  it('ogni PNG esiste e non ne restano di vecchi', async () => {
    const { existsSync, readdirSync } = await fs();
    for (const id of ready) expect(existsSync(at(`assets/backs/${id}.png`))).toBe(true);
    const files = readdirSync(at('assets/backs')).filter(name => name.endsWith('.png'));
    expect(files.sort()).toEqual(ready.map(id => `${id}.png`).sort());
  });
});
