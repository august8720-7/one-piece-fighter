/** Network limits apply to each active file, not an entire character or time in the queue. */
export const ASSET_DOWNLOAD_TIMEOUT = 90_000;
export const ASSET_DOWNLOAD_ATTEMPTS = 2;

export class AssetDownloadError extends Error {
  constructor(readonly code: 'timeout' | 'unavailable' | 'invalid', readonly url: string, message: string) {
    super(`${url}：${message}`);
  }
}

export interface DownloadProgress { completed: number; url: string; retry: boolean }

/** A preload shares one pool across both fighters, UI portraits, stage and FX. */
export class AssetDownloads {
  private active = 0;
  private completed = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly onProgress?: (progress: DownloadProgress) => void) {}

  async read<T>(url: string, consume: (response: Response) => Promise<T>): Promise<T> {
    await new Promise<void>(resolve => {
      const start = (): void => { this.active++; resolve(); };
      if (this.active < 4) start(); else this.queue.push(start);
    });
    try {
      for (let attempt = 0; ; attempt++) {
        this.onProgress?.({ completed: this.completed, url, retry: attempt > 0 });
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let transientHttp = false;
        try {
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new AssetDownloadError('timeout', url, `下载超过90秒，已尝试${attempt + 1}次；请检查网络后重试`));
              controller.abort();
            }, ASSET_DOWNLOAD_TIMEOUT);
          });
          const request = async (): Promise<T> => {
            // Revalidate cached bytes with the server: reuse unchanged files without
            // letting stale metadata bypass the existing content/geometry checks.
            const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
            if (!response.ok) {
              transientHttp = response.status === 408 || response.status === 429 || response.status >= 500;
              throw new AssetDownloadError('unavailable', url, `下载失败（HTTP ${response.status}）`);
            }
            if (response.headers.get('content-type')?.includes('text/html')) {
              throw new AssetDownloadError('unavailable', url, '资源未找到，服务器返回了网页');
            }
            return consume(response);
          };
          const value = await Promise.race([request(), timeout]);
          this.completed++;
          this.onProgress?.({ completed: this.completed, url, retry: false });
          return value;
        } catch (error) {
          const retryable = transientHttp || error instanceof TypeError || (error instanceof AssetDownloadError && error.code === 'timeout');
          if (retryable && attempt + 1 < ASSET_DOWNLOAD_ATTEMPTS) continue;
          if (error instanceof AssetDownloadError) throw error;
          if (error instanceof SyntaxError) throw new AssetDownloadError('invalid', url, '配置不是有效 JSON');
          throw new AssetDownloadError('unavailable', url, error instanceof Error ? error.message : '下载失败');
        } finally { clearTimeout(timer); }
      }
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}
