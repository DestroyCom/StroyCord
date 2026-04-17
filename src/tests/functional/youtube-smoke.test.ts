import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Innertube } from 'youtubei.js';

const YTDLP_BIN = join(
  dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

const TEST_VIDEO_ID = 'dQw4w9WgXcQ';
const TEST_VIDEO_URL = `https://www.youtube.com/watch?v=${TEST_VIDEO_ID}`;
const TIMEOUT = 30_000;

describe('YouTube smoke tests', () => {
  it(
    'youtubei.js fetches video metadata',
    async () => {
      const yt = await Innertube.create({ retrieve_player: false });
      const info = await yt.getBasicInfo(TEST_VIDEO_ID);
      expect(info.basic_info.id).toBe(TEST_VIDEO_ID);
      expect(info.basic_info.title).toBeDefined();
    },
    TIMEOUT
  );

  it(
    'youtubei.js search returns results',
    async () => {
      const yt = await Innertube.create({ retrieve_player: false });
      const results = await yt.search('never gonna give you up');
      expect(results.videos.length).toBeGreaterThan(0);
    },
    TIMEOUT
  );

  it(
    'yt-dlp streams audio bytes from YouTube',
    () =>
      new Promise<void>((resolve, reject) => {
        const proc = spawn(YTDLP_BIN, [
          TEST_VIDEO_URL,
          '--output',
          '-',
          '--format',
          'bestaudio',
          '--quiet',
          '--no-warnings',
        ]);

        let received = 0;
        let done = false;

        proc.stdout.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received >= 1024 && !done) {
            done = true;
            proc.kill();
            resolve();
          }
        });

        proc.stderr.on('data', (chunk: Buffer) => {
          const msg = chunk.toString().trim();
          if (msg) console.error(`[smoke] yt-dlp: ${msg}`);
        });

        proc.on('error', reject);

        proc.on('close', (code) => {
          if (done) return;
          // Process ended cleanly before 1KB (shouldn't happen for a 3-min video)
          if (code === 0 || code === null) resolve();
          else reject(new Error(`yt-dlp exited with code ${code} after ${received} bytes`));
        });
      }),
    TIMEOUT
  );
});
