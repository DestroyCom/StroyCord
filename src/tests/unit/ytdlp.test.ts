import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
    expect(args[args.indexOf('--format') + 1]).toBe('bestaudio[acodec=opus]/bestaudio/best');
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

  it('passes the cookies file when given', async () => {
    const { buildYtdlpArgs } = await loadModule();
    const args = buildYtdlpArgs(URL, '/tmp/x/cookies.txt');

    expect(args[args.indexOf('--cookies') + 1]).toBe('/tmp/x/cookies.txt');
  });

  it('leaves the YouTube-specific options out for SoundCloud', async () => {
    vi.stubEnv('BGUTIL_BASE_URL', 'http://bgutil-provider:4416');
    const { buildYtdlpArgs } = await loadModule();
    const scUrl = 'https://soundcloud.com/forss/flickermood';
    const args = buildYtdlpArgs(scUrl, '/tmp/x/cookies.txt');

    expect(args[0]).toBe(scUrl);
    expect(args).toEqual(expect.arrayContaining(['--output', '-', '--no-playlist']));
    expect(args).not.toContain('--add-header');
    expect(args).not.toContain('--cookies');
    expect(args).not.toContain('--extractor-args');
  });
});

describe('createCookiesCopy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const writeCookies = (content: string) => {
    const file = join(mkdtempSync(join(tmpdir(), 'stroycord-test-')), 'cookies.txt');
    writeFileSync(file, content);
    return file;
  };

  it('returns null when no cookies file is configured or it does not exist', async () => {
    const { createCookiesCopy } = await loadModule();
    vi.stubEnv('YOUTUBE_COOKIES_PATH', '');
    expect(createCookiesCopy()).toBeNull();
    vi.stubEnv('YOUTUBE_COOKIES_PATH', '/does/not/exist/cookies.txt');
    expect(createCookiesCopy()).toBeNull();
  });

  it('creates a private 0600 copy per call and deletes it on cleanup', async () => {
    vi.stubEnv('YOUTUBE_COOKIES_PATH', writeCookies('# Netscape HTTP Cookie File\n'));
    const { createCookiesCopy } = await loadModule();

    const first = createCookiesCopy();
    const second = createCookiesCopy();
    if (!first || !second) throw new Error('expected cookie copies');

    expect(first.path).not.toBe(second.path);
    expect(readFileSync(first.path, 'utf8')).toBe('# Netscape HTTP Cookie File\n');
    expect(statSync(first.path).mode & 0o777).toBe(0o600);

    first.cleanup();
    expect(existsSync(first.path)).toBe(false);
    expect(existsSync(second.path)).toBe(true);
    second.cleanup();
  });

  it('picks up a refreshed source file on the next copy', async () => {
    const source = writeCookies('old');
    vi.stubEnv('YOUTUBE_COOKIES_PATH', source);
    const { createCookiesCopy } = await loadModule();

    const before = createCookiesCopy();
    writeFileSync(source, 'new');
    const after = createCookiesCopy();
    if (!before || !after) throw new Error('expected cookie copies');

    expect(readFileSync(after.path, 'utf8')).toBe('new');
    before.cleanup();
    after.cleanup();
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
