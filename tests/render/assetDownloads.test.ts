import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetDownloads, ASSET_DOWNLOAD_TIMEOUT } from '../../src/render/assetDownloads';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const delay = <T>(ms: number, value: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(value), ms));

describe('public first-load downloads', () => {
  it('aborts active downloads and rejects queued work on permanent game teardown', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>(() => {});
    }));
    const pool = new AssetDownloads();
    const pending = Promise.allSettled(Array.from({ length: 8 }, (_, i) => pool.read(`${i}.png`, r => r.text())));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(4);
    pool.destroy();
    expect((await pending).every(result => result.status === 'rejected')).toBe(true);
    expect(signals.every(signal => signal.aborted)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
    await expect(pool.read('later.png', r => r.text())).rejects.toThrow('游戏已退出');
  });
  it('accepts a body still downloading after eight seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers(), arrayBuffer: () => delay(12_000, new ArrayBuffer(2)) })));
    const loaded = new AssetDownloads().read('atlas.png', response => response.arrayBuffer());
    await vi.advanceTimersByTimeAsync(12_000);
    expect((await loaded).byteLength).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps concurrency at four and gives queued files their full own deadline', async () => {
    vi.useFakeTimers();
    let active = 0; let peak = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      peak = Math.max(peak, ++active);
      await delay(60_000, null); active--;
      return new Response('complete');
    }));
    const progress = vi.fn();
    const pool = new AssetDownloads(progress);
    const pending = Promise.all(Array.from({ length: 8 }, (_, i) => pool.read(`${i}.png`, r => r.text())));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await pending).toEqual(Array(8).fill('complete'));
    expect(peak).toBe(4);
    expect(fetch).toHaveBeenCalledTimes(8);
    expect(progress).toHaveBeenLastCalledWith({ completed: 8, url: '7.png', retry: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retries a timeout with a fresh signal and full deadline', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      if (signals.length === 1) return new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
      return delay(12_000, new Response('recovered'));
    }));
    const pending = new AssetDownloads().read('atlas.png', r => r.text());
    await vi.advanceTimersByTimeAsync(ASSET_DOWNLOAD_TIMEOUT + 12_000);
    expect(await pending).toBe('recovered');
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it('stops after two timeouts and reports the exact file', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    const result = new AssetDownloads().read('atlas-p1.png', r => r.text()).catch(error => error);
    await vi.advanceTimersByTimeAsync(ASSET_DOWNLOAD_TIMEOUT * 2);
    expect(await result).toMatchObject({ code: 'timeout', url: 'atlas-p1.png', message: expect.stringContaining('已尝试2次') });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([408, 429, 503])('retries temporary HTTP %i once', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status })).mockResolvedValueOnce(new Response('ok')));
    expect(await new AssetDownloads().read('floor.webp', r => r.text())).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['404', 'html', 'json'])('does not retry an invalid %s response as a network outage', async kind => {
    const response = kind === '404' ? new Response('', { status: 404 }) : kind === 'html' ? new Response('<html>', { headers: { 'content-type': 'text/html' } }) : new Response('{');
    vi.stubGlobal('fetch', vi.fn(async () => response));
    await expect(new AssetDownloads().read('runtime.json', r => r.json())).rejects.toMatchObject({ url: 'runtime.json', code: kind === 'json' ? 'invalid' : 'unavailable' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
