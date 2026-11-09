import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.json'), 'utf8'));
const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

describe('íconos de la app instalada', () => {
  const todos = [...manifest.icons, ...manifest.shortcuts.flatMap(s => s.icons)];

  it('el manifest usa los PNG del repo (no SVG sueltos con el color viejo)', () => {
    for (const i of todos) {
      expect(i.src.startsWith('data:'), i.src.slice(0, 40)).toBe(false);
      expect(i.type).toBe('image/png');
      expect(fs.existsSync(path.join(RAIZ, i.src)), i.src).toBe(true);
    }
  });

  it('hay uno normal y uno maskable de 192 y de 512', () => {
    const k = manifest.icons.map(i => `${i.purpose}:${i.sizes}`).sort();
    expect(k).toEqual(['any:192x192', 'any:512x512', 'maskable:192x192', 'maskable:512x512']);
  });

  it('cada PNG mide lo que dice el manifest', () => {
    for (const i of manifest.icons) {
      const b = fs.readFileSync(path.join(RAIZ, i.src));
      const [w, h] = [b.readUInt32BE(16), b.readUInt32BE(20)];
      expect(`${w}x${h}`, i.src).toBe(i.sizes);
    }
  });

  it('el ícono de iOS es un PNG que existe', () => {
    const href = index.match(/<link rel="apple-touch-icon" href="([^"]+)"/)[1];
    expect(href.startsWith('data:')).toBe(false);
    expect(fs.existsSync(path.join(RAIZ, href))).toBe(true);
  });

  it('ningún ícono usa el violeta viejo', () => {
    expect(fs.readFileSync(path.join(RAIZ, 'manifest.json'), 'utf8')).not.toMatch(/667eea|7C5CFA/i);
    expect(index).not.toMatch(/667eea/i);
  });
});
