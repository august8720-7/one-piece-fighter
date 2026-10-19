import { describe, expect, it, vi } from 'vitest';
import { defaultEntryUrl, startGameEntry } from '../../src/entryDefaults';

describe('pre-initialization default entry', () => {
  it('fills only absent art/scope/quality while preserving other query fields and hash', () => {
    const url = defaultEntryUrl('http://127.0.0.1:4343/?p1=aokiji&mode=cpu#game');
    expect(Object.fromEntries(url.searchParams)).toEqual({ p1: 'aokiji', mode: 'cpu', art: 'anime', scope: 'full', quality: 'high' });
    expect(url.hash).toBe('#game');
    const sample = defaultEntryUrl('http://localhost/?scope=sample&quality=performance');
    expect(Object.fromEntries(sample.searchParams)).toEqual({ scope: 'sample', quality: 'performance', art: 'anime' });
  });
  it('preserves explicit legacy/anime and leaves frozen path requests alone when art is explicit', () => {
    for (const query of ['art=legacy', 'art=anime&mode=training', 'art=anime&scope=sample&quality=performance']) {
      const href = `https://example.test/v2/?${query}`;
      expect(defaultEntryUrl(href).href).toBe(href);
    }
  });
  it('publishes the final URL before the loader may evaluate any main dependency', async () => {
    const browser = { location: { href: 'http://127.0.0.1:4343/?p1=shanks' }, history: { state: { keep: 1 }, replaceState: vi.fn((_state: unknown, _unused: string, url?: string | URL | null) => { browser.location.href = String(url); }) } };
    const observed: string[] = [];
    await startGameEntry(browser, async () => { observed.push(browser.location.href); });
    expect(new URL(observed[0]!).searchParams.get('art')).toBe('anime');
    expect(new URL(observed[0]!).searchParams.get('scope')).toBe('full');
    expect(browser.history.replaceState).toHaveBeenCalledWith({ keep: 1 }, '', expect.any(String));
  });
});
