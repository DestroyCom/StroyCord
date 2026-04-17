# youtubei.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all four deprecated YouTube dependencies (`@distube/ytdl-core`, `@distube/ytpl`, `@distube/ytsr`, `youtube-dl-exec`) with a single `youtubei.js` InnerTube client, add optional cookie authentication, and migrate the runtime to Node.js 24.

**Architecture:** A singleton `Innertube` instance (exported from `src/core/youtube.ts`) is initialised once at bot startup in `ready.ts`. All request handlers and the audio player import `youtubeClient` from that module. Helper functions (`extractVideoId`, `parseCookiesTxt`) live in `src/utils/youtubeUtils.ts` alongside the existing `yt_validate`.

**Tech Stack:** `youtubei.js`, Node.js 24, vitest, `@discordjs/voice`, TypeScript via tsup/tsx.

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Create | `src/core/youtube.ts` | Innertube singleton + `initYoutubeClient()` |
| Modify | `src/utils/youtubeUtils.ts` | Add `extractVideoId`, `parseCookiesTxt` |
| Modify | `src/utils/interfaces.ts` | Add `PlaylistInfo` interface |
| Modify | `src/utils/songUtils.ts` | `ytdl.getInfo` → `youtubeClient.getBasicInfo` |
| Modify | `src/core/requestHandlers/searchRequest.ts` | `ytsr` → `youtubeClient.search` |
| Modify | `src/core/requestHandlers/playlistRequest.ts` | `ytpl` → `youtubeClient.getPlaylist` |
| Modify | `src/core/player.ts` | `youtube-dl-exec` → `youtubeClient.download` |
| Modify | `src/core/messages.ts` | `ytpl.result` → `PlaylistInfo` |
| Modify | `src/utils/embeds/listSongEmbed.ts` | `ytpl.result` → `PlaylistInfo` |
| Modify | `src/listeners/ready.ts` | Call `initYoutubeClient()` in ClientReady |
| Modify | `src/tests/unit/youtubeUtils.test.ts` | Add tests for `extractVideoId`, `parseCookiesTxt` |
| Modify | `package.json` | Remove 4 deps, add `youtubei.js`, add engines |
| Modify | `Dockerfile` | `node:22-alpine` → `node:24-alpine` |
| Modify | `.github/workflows/ci.yml` | `node-version: 22` → `node-version: 24` |
| Modify | `.env.dist` | Add `YOUTUBE_COOKIES_PATH` (commented) |
| Modify | `docker-compose.yml` | Add cookies volume + env var |

---

## Task 1: Node.js 24 infrastructure

**Files:**
- Modify: `Dockerfile`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

- [ ] **Step 1: Update Dockerfile**

Replace both `node:22-alpine` occurrences with `node:24-alpine`:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /build

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production

WORKDIR /app
RUN apk add --no-cache ffmpeg

COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./

USER node
CMD ["node", "dist/Bot.js"]
```

- [ ] **Step 2: Update CI workflow**

In `.github/workflows/ci.yml`, change line 25:

```yaml
        node-version: 24
```

- [ ] **Step 3: Add engines field to package.json**

Add after the `"version"` line in `package.json`:

```json
"engines": {
  "node": ">=24"
},
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .github/workflows/ci.yml package.json
git commit -m "chore: migrate to Node.js 24"
```

---

## Task 2: Swap npm dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Remove old YouTube dependencies**

```bash
npm remove @distube/ytdl-core @distube/ytpl @distube/ytsr youtube-dl-exec
```

- [ ] **Step 2: Install youtubei.js**

```bash
npm install youtubei.js
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('youtubei.js'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace YouTube deps with youtubei.js"
```

---

## Task 3: PlaylistInfo interface

**Files:**
- Modify: `src/utils/interfaces.ts`

- [ ] **Step 1: Add PlaylistInfo to interfaces.ts**

Append to the end of `src/utils/interfaces.ts`:

```ts
export interface PlaylistInfo {
  url: string;
  title: string;
  author: { name: string };
  items: Array<{ url: string; thumbnail?: string }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/interfaces.ts
git commit -m "feat: add PlaylistInfo interface"
```

---

## Task 4: YouTube utilities — tests first

**Files:**
- Modify: `src/utils/youtubeUtils.ts`
- Modify: `src/tests/unit/youtubeUtils.test.ts`

- [ ] **Step 1: Write failing tests for extractVideoId and parseCookiesTxt**

Add to the end of `src/tests/unit/youtubeUtils.test.ts` (keep all existing tests intact):

```ts
import { extractVideoId, parseCookiesTxt } from 'src/utils/youtubeUtils';

describe('extractVideoId', () => {
  it('extracts ID from full watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns raw ID unchanged', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('ignores extra query params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });
});

describe('parseCookiesTxt', () => {
  it('converts Netscape cookies to header string', () => {
    const input = [
      '# Netscape HTTP Cookie File',
      '.youtube.com\tTRUE\t/\tTRUE\t1234567890\tVISITOR_INFO1_LIVE\tabc123',
      '.youtube.com\tTRUE\t/\tFALSE\t9999999999\tYSC\txyz789',
    ].join('\n');
    expect(parseCookiesTxt(input)).toBe('VISITOR_INFO1_LIVE=abc123; YSC=xyz789');
  });

  it('ignores comment and empty lines', () => {
    const input = '# comment\n\n.youtube.com\tTRUE\t/\tTRUE\t0\tFOO\tBAR\n';
    expect(parseCookiesTxt(input)).toBe('FOO=BAR');
  });

  it('returns empty string for file with only comments', () => {
    expect(parseCookiesTxt('# nothing here\n')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose src/tests/unit/youtubeUtils.test.ts
```

Expected: tests for `extractVideoId` and `parseCookiesTxt` fail with `is not a function`.

- [ ] **Step 3: Implement extractVideoId and parseCookiesTxt**

Add to the end of `src/utils/youtubeUtils.ts`:

```ts
export function extractVideoId(urlOrId: string): string {
  const url = urlOrId.trim();
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split(/[?&/]/)[0];
  if (url.includes('watch?v=')) return url.split('watch?v=')[1].split(/[?&]/)[0];
  const pathMatch = url.match(/(?:shorts|embed|live)\/([a-zA-Z\d_-]{11,12})/);
  if (pathMatch) return pathMatch[1];
  return url;
}

export function parseCookiesTxt(content: string): string {
  return content
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) return `${parts[5].trim()}=${parts[6].trim()}`;
      return null;
    })
    .filter((c): c is string => c !== null)
    .join('; ');
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose src/tests/unit/youtubeUtils.test.ts
```

Expected: all tests pass including the new ones.

- [ ] **Step 5: Commit**

```bash
git add src/utils/youtubeUtils.ts src/tests/unit/youtubeUtils.test.ts
git commit -m "feat: add extractVideoId and parseCookiesTxt utilities"
```

---

## Task 5: Create src/core/youtube.ts

**Files:**
- Create: `src/core/youtube.ts`

- [ ] **Step 1: Create the file**

```ts
import { existsSync, readFileSync } from 'fs';
import { Innertube } from 'youtubei.js';
import { parseCookiesTxt } from 'src/utils/youtubeUtils';

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
```

- [ ] **Step 2: Commit**

```bash
git add src/core/youtube.ts
git commit -m "feat: add Innertube singleton with optional cookie auth"
```

---

## Task 6: Update songUtils.ts

**Files:**
- Modify: `src/utils/songUtils.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/utils/songUtils.ts` entirely with:

```ts
import type { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import { extractVideoId } from 'src/utils/youtubeUtils';

import type { songInterface } from './interfaces';

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  const videoId = extractVideoId(url);
  let info: Awaited<ReturnType<typeof youtubeClient.getBasicInfo>>;
  try {
    info = await youtubeClient.getBasicInfo(videoId);
  } catch (e) {
    throw new Error(`Failed to fetch video info: ${String(e)}`);
  }

  const b = info.basic_info;
  const title = b.title ?? '';
  const videoAuthor = b.author ?? '';
  const duration = b.duration ?? 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  const thumbnails = b.thumbnail ?? [];
  const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';
  const videoUrl = `https://www.youtube.com/watch?v=${b.id ?? videoId}`;

  return {
    title,
    url: videoUrl,
    thumbnail,
    videoAuthor,
    videoLength: minutes === 0 && seconds === 0 ? '`Livestream`' : formattedTime,
    minutes,
    seconds,
    requestDateTimestamp: Date.now(),
    requestAuthor: {
      id: Author.id,
      username: Author.username,
    },
    requestChannel,
    isQueueStart,
    isComingFromPlaylist,
  };
};

export const extractVoiceChannelData = async (
  voiceChannel: VoiceBasedChannel
): Promise<{
  channelId: string;
  guildId: string;
  guild: Guild;
  adapterCreator: InternalDiscordGatewayAdapterCreator;
}> => {
  return {
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    guild: voiceChannel.guild,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  };
};
```

- [ ] **Step 2: Run existing tests to confirm they still pass**

```bash
npm test -- --reporter=verbose src/tests/unit/songRequest.test.ts
```

Expected: all 3 tests pass (they mock `src/utils/songUtils` at module level, so they are unaffected by the implementation change).

- [ ] **Step 3: Commit**

```bash
git add src/utils/songUtils.ts
git commit -m "feat: migrate songUtils to youtubei.js getBasicInfo"
```

---

## Task 7: Update searchRequest.ts

**Files:**
- Modify: `src/core/requestHandlers/searchRequest.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import type { User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import { sendErrorEmbed } from 'src/core/messages';

import { songRequest } from './songRequest';

export const searchSong = async (
  searchInput: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const results = await youtubeClient.search(searchInput);
  const firstVideo = results.videos?.[0];

  if (!firstVideo?.id) {
    await sendErrorEmbed(guildId, textChannelId, `No results found for: ${searchInput}`);
    return;
  }

  await songRequest(
    `https://www.youtube.com/watch?v=${firstVideo.id}`,
    guildId,
    requestAuthor,
    textChannelId,
    voiceChannel
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/core/requestHandlers/searchRequest.ts
git commit -m "feat: migrate searchRequest to youtubei.js search"
```

---

## Task 8: Update playlistRequest.ts

**Files:**
- Modify: `src/core/requestHandlers/playlistRequest.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import type { User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import type { PlaylistInfo } from 'src/utils/interfaces';

import { sendQueueEmbed } from '../messages';
import { songRequest } from './songRequest';

export const playlistHandler = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const playlist = await youtubeClient.getPlaylist(url);

  for (const video of playlist.videos) {
    if (!video.id) continue;
    try {
      await songRequest(
        `https://www.youtube.com/watch?v=${video.id}`,
        guildId,
        requestAuthor,
        textChannelId,
        voiceChannel,
        true
      );
    } catch (_error) {
      console.log('error in playlistHandler');
    }
  }

  const playlistInfo: PlaylistInfo = {
    url,
    title: playlist.info.title?.toString() ?? '',
    author: { name: playlist.info.author?.name?.toString() ?? '' },
    items: playlist.videos.map(v => ({
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail: v.thumbnails?.[0]?.url,
    })),
  };

  sendQueueEmbed(guildId, playlistInfo, textChannelId, requestAuthor);
};
```

- [ ] **Step 2: Commit**

```bash
git add src/core/requestHandlers/playlistRequest.ts
git commit -m "feat: migrate playlistRequest to youtubei.js getPlaylist"
```

---

## Task 9: Update player.ts

**Files:**
- Modify: `src/core/player.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { Readable } from 'stream';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import { activePlayers, client } from 'src/Bot';
import { sendErrorEmbed } from 'src/core/messages';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { getCurrentVoiceChannel, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import {
  createAudioPlayerListener,
  removeAllAudioPlayerListener,
  voiceConnectionErrorListener,
} from 'src/listeners/playerListeners';
import type { songInterface } from 'src/utils/interfaces';
import { extractVideoId } from 'src/utils/youtubeUtils';
import { youtubeClient } from 'src/core/youtube';

export const songPlayer = async (guildId: string) => {
  const voiceChannel = await getCurrentVoiceChannel(guildId);
  const nextSong: songInterface = await getFirstSong(guildId);
  const adapterCreator = (await client.guilds.fetch(voiceChannel.guildId)).voiceAdapterCreator;
  let audioPlayer = activePlayers[guildId]?.audioPlayer;

  if (nextSong === undefined) {
    return;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.channelId,
    guildId: voiceChannel.guildId,
    adapterCreator,
  });

  if (!audioPlayer) {
    audioPlayer = createAudioPlayer();
    activePlayers[guildId] = {
      audioPlayer,
    };

    createAudioPlayerListener(audioPlayer, guildId);
  }

  const videoId = extractVideoId(nextSong.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webStream: any;
  try {
    webStream = await youtubeClient.download(videoId, { type: 'audio', quality: 'best' });
  } catch (e) {
    await sendErrorEmbed(guildId, nextSong.requestChannel, `Failed to create audio stream for: ${nextSong.title}`);
    return;
  }

  const stream = Readable.fromWeb(webStream as ReadableStream<Uint8Array>);
  const audioStream = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });

  audioPlayer.play(audioStream);
  connection.subscribe(audioPlayer);

  voiceConnectionErrorListener(guildId);
};

export const skipSong = async (guildId: string) => {
  const hasFollowingSong: songInterface[] = await getNextSongs(guildId);

  if (hasFollowingSong.length === 0) {
    remove(guildId, true);
    return;
  }

  await shiftSongs(guildId);
  await songPlayer(guildId);
};

export const remove = async (guildId: string, isFromSkip: boolean = false) => {
  if (isFromSkip) {
    await removeCurrentPlayingSong(guildId);
  } else {
    await emptyNextSongs(guildId);
  }

  if (activePlayers[guildId]?.audioPlayer) {
    removeAllAudioPlayerListener(activePlayers[guildId].audioPlayer);
    activePlayers[guildId].audioPlayer.stop();
    delete activePlayers[guildId];
  }

  getVoiceConnection(guildId)?.disconnect();
  getVoiceConnection(guildId)?.destroy();
  getVoiceConnection(guildId)?.removeAllListeners();
  return;
};

export const pause = async (guildId: string) => {
  if (!activePlayers[guildId]) return;
  if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Playing) return;

  activePlayers[guildId].audioPlayer.pause();
};

export const resume = async (guildId: string) => {
  if (!activePlayers[guildId]) return;
  if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Paused) return;

  activePlayers[guildId].audioPlayer.unpause();
};
```

- [ ] **Step 2: Commit**

```bash
git add src/core/player.ts
git commit -m "feat: migrate player to youtubei.js audio streaming"
```

---

## Task 10: Update playlist embed types

**Files:**
- Modify: `src/core/messages.ts`
- Modify: `src/utils/embeds/listSongEmbed.ts`

- [ ] **Step 1: Update messages.ts**

Replace the top of `src/core/messages.ts` (lines 1–8) — remove the `ytpl` import and replace the type:

```ts
import type { TextChannel, User } from 'discord.js';
import { client } from 'src/Bot';
import { getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { unknownError } from 'src/utils/embeds/errorsEmbed';
import { playlistEmbed } from 'src/utils/embeds/listSongEmbed';
import { addSongEmbed, newSongEmbed } from 'src/utils/embeds/songEmbed';
import type { PlaylistInfo, songInterface } from 'src/utils/interfaces';
```

Then change the `sendQueueEmbed` signature (the `playlistData` parameter type):

```ts
export const sendQueueEmbed = async (
  guildId: string,
  playlistData: PlaylistInfo,
  textChannelId: string,
  author: User
) => {
```

- [ ] **Step 2: Update listSongEmbed.ts**

Replace the top of `src/utils/embeds/listSongEmbed.ts` — remove the `ytpl` import:

```ts
import { EmbedBuilder, type User } from 'discord.js';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import type { PlaylistInfo, songInterface } from '../interfaces';
```

Change the `playlistEmbed` signature:

```ts
export const playlistEmbed = async (author: User, playlistData: PlaylistInfo): Promise<EmbedBuilder> => {
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "vitest.config"
```

Expected: no errors related to the changed files.

- [ ] **Step 4: Commit**

```bash
git add src/core/messages.ts src/utils/embeds/listSongEmbed.ts
git commit -m "feat: replace ytpl.result with PlaylistInfo in embed layer"
```

---

## Task 11: Wire initYoutubeClient in ready.ts

**Files:**
- Modify: `src/listeners/ready.ts`

- [ ] **Step 1: Add initYoutubeClient call**

Replace `src/listeners/ready.ts` with:

```ts
import { type Client, Events } from 'discord.js';
import { setActivity } from 'src/core/activityStatus';
import { initYoutubeClient } from 'src/core/youtube';
import { deployCommands } from 'src/deploy-commands';

export default (client: Client): void => {
  client.on(Events.ClientReady, async () => {
    if (!client.user || !client.application) {
      return;
    }

    await initYoutubeClient();
    await setActivity(client);
    console.log(`${client.user.username} is online !`);

    const Guilds = client.guilds.cache.map((guild) => guild.id);

    for (const guild of Guilds) {
      await deployCommands({ guildId: guild });
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
  });
};
```

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "vitest.config"
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/listeners/ready.ts
git commit -m "feat: initialise youtubei.js client on bot ready"
```

---

## Task 12: Config — .env.dist and docker-compose.yml

**Files:**
- Modify: `.env.dist`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add YOUTUBE_COOKIES_PATH to .env.dist**

Add to `.env.dist` (after the existing entries):

```env
# Optional — path to a cookies.txt file exported from YouTube (Netscape format)
# Without this, the bot works in unauthenticated mode (public videos only)
# YOUTUBE_COOKIES_PATH=./cookies.txt
```

- [ ] **Step 2: Add cookies volume to docker-compose.yml**

In the `stroycord` service, add under `environment`:

```yaml
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID}
      PREFIX: ${PREFIX:-&}
      LANGUAGE: ${LANGUAGE:-en-US}
      DATABASE_CONNECTION_STRING: ${DATABASE_CONNECTION_STRING:-mongodb://mongodb:27017}
      DATABASE_USER: ${DATABASE_USER}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      DATABASE_NAME: ${DATABASE_NAME:-stroycord}
      YOUTUBE_COOKIES_PATH: ${YOUTUBE_COOKIES_PATH:-}
    volumes:
      - ${YOUTUBE_COOKIES_PATH_HOST:-/dev/null}:/app/cookies.txt:ro
```

> Note: when the user wants to use cookies they set two vars in their `.env`:
> ```
> YOUTUBE_COOKIES_PATH=/app/cookies.txt
> YOUTUBE_COOKIES_PATH_HOST=/absolute/host/path/to/cookies.txt
> ```
> When not using cookies, both vars are unset — Docker mounts `/dev/null` read-only which is harmless, and `youtube.ts` skips the cookie load because `YOUTUBE_COOKIES_PATH` is empty.

- [ ] **Step 3: Commit**

```bash
git add .env.dist docker-compose.yml
git commit -m "chore: add YOUTUBE_COOKIES_PATH config for cookies auth"
```

---

## Task 13: Final lint and build check

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: exits 0 (only pre-existing warnings about `noNonNullAssertion` in slash command files, which are unrelated to this migration).

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: exits 0, `dist/Bot.js` produced.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: post-migration lint and build verification"
```
