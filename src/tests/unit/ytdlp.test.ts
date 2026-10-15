import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const loadModule = async () => {
  vi.resetModules();
  return import('src/core/ytdlp');
};

describe('buildYtdlpArgs', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('YOUTUBE_COOKIES_PATH', '');
    vi.stubEnv('BGUTIL_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('streams best audio to stdout with node as JS challenge runtime', async () => {
    const { buildYtdlpArgs } = await loadModule();
    const args = buildYtdlpArgs(URL);

    expect(args[0]).toBe(URL);
    expect(args).toEqual(expect.arrayContaining(['--output', '-', '--no-playlist']));
    expect(args[args.indexOf('--format') + 1]).toBe('bestaudio/best');
    expect(args[args.indexOf('--js-runtimes') + 1]).toBe(`node:${process.execPath}`);
    expect(args).not.toContain('--cookies');
    expect(args).not.toContain('--extractor-args');
  });

  it('adds bgutil extractor args when BGUTIL_BASE_URL is set', async () => {
    vi.stubEnv('BGUTIL_BASE_URL', 'http://bgutil-provider:4416');
    const { buildYtdlpArgs } = await loadModule();
    const args = buildYtdlpArgs(URL);

    expect(args[args.indexOf('--extractor-args') + 1]).toBe(
      'youtubepot-bgutilhttp:base_url=http://bgutil-provider:4416'
    );
  });

  it('uses a writable copy of the cookies file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stroycord-test-'));
    const cookies = join(dir, 'cookies.txt');
    writeFileSync(cookies, '# Netscape HTTP Cookie File\n');
    vi.stubEnv('YOUTUBE_COOKIES_PATH', cookies);

    const { buildYtdlpArgs } = await loadModule();
    const args = buildYtdlpArgs(URL);
    const used = args[args.indexOf('--cookies') + 1];

    expect(used).not.toBe(cookies);
    expect(readFileSync(used, 'utf8')).toBe('# Netscape HTTP Cookie File\n');
  });

  it('ignores a cookies path that does not exist', async () => {
    vi.stubEnv('YOUTUBE_COOKIES_PATH', '/does/not/exist/cookies.txt');
    const { buildYtdlpArgs } = await loadModule();

    expect(buildYtdlpArgs(URL)).not.toContain('--cookies');
  });
});

describe('extractYtdlpError', () => {
  it('returns undefined when there is no ERROR line', async () => {
    const { extractYtdlpError } = await loadModule();
    expect(extractYtdlpError('WARNING: something')).toBeUndefined();
  });

  it('keeps the last error message', async () => {
    const { extractYtdlpError } = await loadModule();
    expect(extractYtdlpError('ERROR: unable to download video data: HTTP Error 403: Forbidden')).toBe(
      'unable to download video data: HTTP Error 403: Forbidden'
    );
  });

  it('strips the extractor and video id prefix so errors group together', async () => {
    const { extractYtdlpError } = await loadModule();
    expect(extractYtdlpError('ERROR: [youtube] 3iyrIQFKtYY: Sign in to confirm you’re not a bot')).toBe(
      'Sign in to confirm you’re not a bot'
    );
  });
});
