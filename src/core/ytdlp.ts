import { spawn } from 'node:child_process';
import { chmodSync, constants, copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// yt-dlp binary path managed by youtube-dl-exec. In Docker it is replaced at build
// time by the pip-installed yt-dlp pinned in .ytdlp-version (see Dockerfile).
export const YTDLP_BIN = join(
  dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

let cookiesFile: string | null | undefined;

/**
 * yt-dlp rewrites the cookie jar on exit, which fails on a read-only mount
 * (docker-compose mounts cookies.txt with :ro). Work on a writable copy instead.
 */
const resolveCookiesFile = (): string | null => {
  if (cookiesFile !== undefined) return cookiesFile;
  const source = process.env.YOUTUBE_COOKIES_PATH;
  cookiesFile = null;
  if (!source || !existsSync(source)) return cookiesFile;
  try {
    // Private dir (0700, unpredictable name) + 0600 file: the cookies hold a YouTube session
    const copy = join(mkdtempSync(join(tmpdir(), 'stroycord-')), 'cookies.txt');
    copyFileSync(source, copy, constants.COPYFILE_EXCL);
    chmodSync(copy, 0o600);
    cookiesFile = copy;
  } catch (e) {
    console.error('[ytdlp] failed to copy cookies file, using it read-only:', e);
    cookiesFile = source;
  }
  return cookiesFile;
};

/**
 * Builds yt-dlp arguments for streaming the audio of a YouTube video to stdout.
 * Same strategy as StroyGetter / StroyGetter Native:
 * - `--js-runtimes node`: since late 2025 YouTube requires solving JS challenges
 *   (n / signature). Without a JS runtime yt-dlp gets stream URLs that answer
 *   HTTP 403. yt-dlp only enables deno by default, so node must be opted in.
 * - referer + googlebot UA headers
 * - optional cookies (YOUTUBE_COOKIES_PATH) for age-restricted videos
 * - optional bgutil PoToken provider (BGUTIL_BASE_URL)
 */
export const buildYtdlpArgs = (url: string): string[] => {
  const args = [
    url,
    '--output',
    '-', // pipe audio to stdout
    '--format',
    'bestaudio/best',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    '--js-runtimes',
    `node:${process.execPath}`,
    '--add-header',
    'referer:youtube.com',
    '--add-header',
    'user-agent:googlebot',
  ];

  const cookies = resolveCookiesFile();
  if (cookies) args.push('--cookies', cookies);

  const bgutilUrl = process.env.BGUTIL_BASE_URL;
  if (bgutilUrl) args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${bgutilUrl}`);

  return args;
};

export const createYtdlpStream = (url: string) => {
  // spawn is safe: arguments are passed as an array (no shell, no injection)
  return spawn(YTDLP_BIN, buildYtdlpArgs(url));
};

/** Extracts the last `ERROR:` line of yt-dlp stderr, without the video id so errors group well. */
export const extractYtdlpError = (stderr: string): string | undefined => {
  if (!stderr.includes('ERROR:')) return undefined;
  return stderr
    .split('ERROR:')
    .pop()
    ?.trim()
    .replace(/^\[[\w:]+\]\s+[\w-]+:\s*/, '');
};
