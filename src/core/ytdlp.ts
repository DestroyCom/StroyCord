import { execFile, spawn } from 'node:child_process';
import { chmodSync, constants, copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { isSoundcloudUrl } from 'src/utils/soundcloudUtils';

// yt-dlp binary path managed by youtube-dl-exec. In Docker it is replaced at build
// time by the pip-installed yt-dlp pinned in .ytdlp-version (see Dockerfile).
export const YTDLP_BIN = join(
  dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

type CookiesCopy = { path: string; cleanup: () => void };

/**
 * Copies YOUTUBE_COOKIES_PATH into a private temp dir (0700, file 0600) for one
 * yt-dlp process. yt-dlp rewrites the cookie jar on exit, which fails on a
 * read-only mount, and concurrent processes must not share one jar. A fresh
 * copy per process also picks up a refreshed source file without a restart.
 */
export const createCookiesCopy = (): CookiesCopy | null => {
  const source = process.env.YOUTUBE_COOKIES_PATH;
  if (!source || !existsSync(source)) return null;
  let dir: string | undefined;
  try {
    dir = mkdtempSync(join(tmpdir(), 'stroycord-'));
    const copy = join(dir, 'cookies.txt');
    copyFileSync(source, copy, constants.COPYFILE_EXCL);
    chmodSync(copy, 0o600);
    const privateDir = dir;
    return { path: copy, cleanup: () => rmSync(privateDir, { recursive: true, force: true }) };
  } catch (e) {
    console.error('[ytdlp] failed to copy cookies file, using it read-only:', e);
    if (dir) rmSync(dir, { recursive: true, force: true });
    return { path: source, cleanup: () => {} };
  }
};

/**
 * Builds yt-dlp arguments for streaming the audio of a YouTube video (or a SoundCloud track) to stdout.
 * Opus audio is preferred: YouTube serves it in WebM, which the player can send
 * to Discord as-is (no ffmpeg / Opus re-encoding, see demuxProbe in player.ts).
 * Same strategy as StroyGetter / StroyGetter Native:
 * - `--js-runtimes node`: since late 2025 YouTube requires solving JS challenges
 *   (n / signature). Without a JS runtime yt-dlp gets stream URLs that answer
 *   HTTP 403. yt-dlp only enables deno by default, so node must be opted in.
 * - referer + googlebot UA headers
 * - optional cookies (YOUTUBE_COOKIES_PATH copy) for age-restricted videos
 * - optional bgutil PoToken provider (BGUTIL_BASE_URL)
 * The YouTube-specific options are left out for SoundCloud: its client_id is scraped
 * from the soundcloud.com page, which a googlebot user agent may not get.
 */
export const buildYtdlpArgs = (url: string, cookiesPath?: string): string[] => {
  const args = [
    url,
    '--output',
    '-', // pipe audio to stdout
    '--format',
    'bestaudio[acodec=opus]/bestaudio/best',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
  ];
  if (isSoundcloudUrl(url)) return args;

  args.push(
    '--js-runtimes',
    `node:${process.execPath}`,
    '--add-header',
    'referer:youtube.com',
    '--add-header',
    'user-agent:googlebot'
  );

  if (cookiesPath) args.push('--cookies', cookiesPath);

  const bgutilUrl = process.env.BGUTIL_BASE_URL;
  if (bgutilUrl) args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${bgutilUrl}`);

  return args;
};

export const createYtdlpStream = (url: string) => {
  // YOUTUBE_COOKIES_PATH holds YouTube cookies only
  const cookies = isSoundcloudUrl(url) ? null : createCookiesCopy();
  // spawn is safe: arguments are passed as an array (no shell, no injection)
  const proc = spawn(YTDLP_BIN, buildYtdlpArgs(url, cookies?.path));
  if (cookies) {
    // 'close' doesn't fire when spawn itself fails, 'error' covers that case
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      cookies.cleanup();
    };
    proc.once('close', cleanup);
    proc.once('error', cleanup);
  }
  return proc;
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

/** Subset of the yt-dlp JSON (`--dump-single-json`) read by the bot */
export interface YtdlpInfo {
  _type?: 'video' | 'playlist' | 'url';
  id?: string;
  title?: string;
  uploader?: string;
  /** Seconds, may be a float */
  duration?: number;
  thumbnail?: string;
  webpage_url?: string;
  url?: string;
  entries?: YtdlpInfo[];
}

const INFO_TIMEOUT_MS = 60_000;

/**
 * Fetches the metadata of a URL without downloading anything. Playlists are flat:
 * their entries only carry an url (and sometimes a title), each one is resolved on its own.
 * Used for SoundCloud, YouTube metadata goes through youtubei.js (src/core/youtube.ts).
 */
export const fetchYtdlpInfo = (url: string): Promise<YtdlpInfo> =>
  new Promise((resolve, reject) => {
    // execFile is safe: arguments are passed as an array (no shell, no injection)
    execFile(
      YTDLP_BIN,
      ['--dump-single-json', '--flat-playlist', '--no-warnings', '--', url],
      { timeout: INFO_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(extractYtdlpError(stderr) ?? error.message));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as YtdlpInfo);
        } catch (e) {
          reject(new Error(`Invalid yt-dlp output: ${String(e)}`));
        }
      }
    );
  });
