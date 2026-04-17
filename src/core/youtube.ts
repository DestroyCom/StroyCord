import { existsSync, readFileSync } from 'node:fs';
import { parseCookiesTxt } from 'src/utils/youtubeUtils';
import { Innertube } from 'youtubei.js';

export let youtubeClient!: Innertube;

export async function initYoutubeClient(): Promise<void> {
  const cookiesPath = process.env.YOUTUBE_COOKIES_PATH;
  let cookie: string | undefined;

  if (cookiesPath) {
    if (existsSync(cookiesPath)) {
      cookie = parseCookiesTxt(readFileSync(cookiesPath, 'utf-8')) || undefined;
    } else {
      console.warn(`[youtube] YOUTUBE_COOKIES_PATH set but file not found: ${cookiesPath}`);
    }
  }

  youtubeClient = await Innertube.create({
    cookie,
    generate_session_locally: true,
  });
}
