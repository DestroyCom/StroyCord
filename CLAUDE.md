# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Run with hot reload (tsx watch)
npm run build      # Lint + compile to dist/ via tsup (minified)
npm run lint       # Biome check + auto-fix on all files
npm run start      # Run compiled dist/Bot.js (production)
npm run knip       # Detect unused exports/files
```

The bot requires a running MongoDB instance and valid `.env` to start.

**Tests (Vitest):**
```bash
npm test                   # Run all tests
npm run test:functional    # Functional tests only
npm run test:coverage      # Run with coverage report
```

**Docker (full stack):**
```bash
docker compose up -d           # Starts bot + MongoDB + mongo-express (UI on :8081)
npm run docker:logs            # Tail bot logs
npm run docker:test-env        # Start only MongoDB + mongo-express (for local dev)
npm run docker:clean           # Full teardown including volumes
```

## Architecture

### Request Flow

A user command goes through one of two entry points:

1. **Text command** (`&play ...`) → `src/listeners/messageListener.ts` loads the guild settings (prefix, allowed channels, bare-link detection), parses the prefix+command, routes via `switch` to a function in `src/commands/textCommands.ts`
2. **Slash command** (`/play`) → `src/listeners/interactionListener.ts` checks the allowed channels (except `/config`) and routes to `src/commands/slashCommands/<name>.ts` via the `commands` map in `src/commands/slashCommands/index.ts`. Buttons/selects/modals are routed by `customId` prefix (`cfg:` → `/config`, `stats:` → `/stats` pagination) — no collectors, so they survive restarts

Both paths ultimately call the same functions in `textCommands.ts`, which call into `src/core/requestHandlers/`.

### Play Request Handlers (`src/core/requestHandlers/`)

Three handlers resolve the input type before calling into the player (`playCommand` routes with `parseSoundcloudUrl` first, then `yt_validate`):

- `songRequest.ts` — single YouTube / SoundCloud URL → `extractSongData` (youtubei.js `getBasicInfo` for YouTube, `fetchYtdlpInfo` for SoundCloud) → `pushSongIfAllowed` → `songPlayer`
- `playlistRequest.ts` — YouTube playlist (youtubei.js `getPlaylist(<id>)` — the id, not the URL — plus continuations, capped at `QUEUE_LIMIT_CAP`) or SoundCloud set (`fetchYtdlpInfo`, flat) → calls `songRequest` per item. A SoundCloud short link (`on.soundcloud.com`) also goes there and falls back to `songRequest` when it resolves to a track
- `searchRequest.ts` — text search → youtubei.js search → calls `songRequest` with the first result

SoundCloud (`src/utils/soundcloudUtils.ts`): `parseSoundcloudUrl` accepts tracks, `/sets/` and short links (profiles and their tabs are rejected), `isSoundcloudUrl` any SoundCloud host (playlist entries can be `api.soundcloud.com/tracks/<id>`). Songs store the permalink, which is also their stats key (`videoId`). Go+ tracks (only `…_preview` formats) are refused: `PreviewOnlyError` at request time (silent in a playlist, counted as skipped), and the streaming format excludes previews (`[format_id!*=preview]`). A YouTube video carrying its auto-generated mix (`watch?v=…&list=RD…`) is a single video, not a playlist.

### Player (`src/core/player.ts`)

`songPlayer(guildId)` is the core playback engine:
- Fetches the first song from MongoDB (`nextSongs[0]`)
- Joins the voice channel stored in DB
- Creates/reuses an `AudioPlayer` stored in the in-memory `activePlayers` map (exported from `Bot.ts`)
- Streams audio via yt-dlp (`src/core/ytdlp.ts`, Opus preferred) → `demuxProbe` → `createAudioResource`. WebM/Opus (YouTube's usual best audio) goes to Discord as-is, with no ffmpeg or Opus encoding; other formats fall back to `StreamType.Arbitrary` (ffmpeg + Opus encoder). The yt-dlp process per guild is killed on skip/stop

`activePlayers` is an in-memory map `{ [guildId]: { audioPlayer } }` — the single source of truth for whether a guild is currently playing.

### yt-dlp (`src/core/ytdlp.ts`)

Same setup as StroyGetter. For YouTube, `buildYtdlpArgs()` always passes `--js-runtimes node:<execPath>` — YouTube requires JS challenge solving, and without a runtime stream URLs return **HTTP 403**. In Docker, yt-dlp is installed from PyPI (`yt-dlp[default]`, includes the `yt-dlp-ejs` solver) at the version pinned in `.ytdlp-version` (bumped daily by `watch_ytdlp.yml`), along with the `bgutil-ytdlp-pot-provider` plugin, and copied over `node_modules/youtube-dl-exec/bin/yt-dlp`. Optional: `YOUTUBE_COOKIES_PATH` (a private 0600 copy per yt-dlp process, deleted when it exits), `BGUTIL_BASE_URL` (docker-compose runs a `bgutil-provider` service). SoundCloud URLs get none of the YouTube options (headers, cookies, PoToken). `fetchYtdlpInfo()` reads metadata (`--dump-single-json --flat-playlist`) for SoundCloud.

### Per-guild settings (`/config`)

- `src/config/settings.ts` — `StoredSettings` (null = instance default from `.env`), `resolveSettings()`, parsers, `isChannelAllowed()`. Settings: prefix, language, detectFromAllMessages, commandChannelIds (empty = all), maxQueueSize / maxSongsPerUser (**song currently playing included**, capped at 500), statsEnabled, replyChannelId / replyMessagesEnabled, commandMode (`both` / `text` / `slash`), blockedRoleIds
- **Blocked roles**: both listeners return silently (no reply at all) when `isMemberBlocked()`, right after loading the settings. Only exception: a member with `ManageGuild` keeps `/config` and its `cfg:` components, so an admin can always undo a block. The role picker is a modal (`blockedRolesModal`): the panel already uses Discord's 5 rows
- **Bot messages** go through `sendBotMessage(guildId, commandChannelId, embed, kind)` (`src/core/messages.ts`), never `textChannel.send` directly. `resolveMessageChannel()` picks the channel: `info` (queue, current) and `announce` (now playing, added, skip, pause…) go to the reply channel, `announce` is dropped when replies are disabled, `error` always stays in the command channel. An unavailable reply channel falls back to the command channel
- **Command mode**: `slash` makes `messageListener` ignore prefix commands (bare-link detection keeps its own toggle). `text` removes slash commands from the guild on redeploy (`deployCommands` filters with `isSlashCommandEnabled`), except `/config` and `/stats`; changing the mode in `/config` redeploys
- `src/core/settings.ts` — in-memory write-through cache over the `GuildSettings` collection (`getGuildSettings`, `updateGuildSettings`)
- `src/config/guildContext.ts` — `AsyncLocalStorage` holding the settings of the guild being handled. `i18n.t()` and `getPrefix()` read it (instance defaults outside a context). Entry points wrap their work in `runWithSettings` / `withGuildSettings`; the audio player listeners must too, since `@discordjs/voice` emits from a global loop. **Never set `i18n.locale`.** Business logic (limits, stats) reads `getGuildSettings(guildId)` explicitly
- `/config` (`src/commands/slashCommands/config.ts`, panel in `src/utils/embeds/configEmbed.ts`) is admin-only: default member permission `ManageGuild` + re-check on every component and modal

### Queue limits

`pushSongIfAllowed` (`src/database/queries/guilds/update.ts`) pushes with an atomic `$expr`/`$size` condition, returning `'queued' | 'queueFull' | 'userLimit'`. `songRequest` returns that result; `playlistHandler` stops at the first limit.

### Queue editing (`/priority`, `/clearplaylist`)

Each queued song gets a `queueId` (uuid, in `songRequest`) and songs from a playlist a `playlist: { id, title }` tag (one id per `playlistHandler` call). `prioritizeSong` / `removePlaylistSongs` (`update.ts`) are single pipeline updates (`updatePipeline: true`) that never touch `nextSongs[0]`, the song playing. Positions are the ones `/queue` shows (`getNextSongs`, 1-based); the move targets the `queueId` read at that position. Both slash commands use autocomplete, routed in `interactionListener` to the command's `autocomplete` export. Open to every member, like `/skip`.

### Statistics (`/stats`)

`Play` collection, one document per listened song (`src/core/stats.ts`). `createAudioResource` carries the song as `metadata`; `trackPlay` runs when the player's resource changes (song ended → Idle, skipped → Buffering of the next one) and in `remove()` before `stop()` (listeners are already detached there). Duration = `resource.playbackDuration` (pauses excluded); plays < 5 s are ignored. Aggregations in `src/database/queries/plays.ts`.

### Error reporting (`src/config/monitoring.ts`)

GlitchTip via `@sentry/node`, enabled only when `GLITCHTIP_DSN` is set. Imported first in `Bot.ts`. Use `captureError(err, { guildId, ... })` / `captureMessage(msg, context, level)` — keep variable data (urls, ids) in the context so GlitchTip groups issues by message.

### State: In-Memory vs. Database

| State | Where |
|---|---|
| Is playing / AudioPlayer ref | `activePlayers` (in-memory, `Bot.ts`) |
| Song queue (`nextSongs`) | MongoDB `Guild` document |
| Play history (`previouslyPlayedSongs`, last 50) | MongoDB `Guild` document |
| Current voice channel | MongoDB `Guild` document |
| Guild settings | MongoDB `GuildSettings` collection (+ in-memory cache) |
| Listening stats | MongoDB `Play` collection |

On startup, `connectToDatabase` removes duplicate `Guild` documents, builds indexes (`autoIndex` is off), then calls `emptyAllGuild()` — this wipes queues and voice channel state (runtime only), since in-memory `activePlayers` is always empty on a fresh start. **Settings and stats must never be stored in `Guild`**: they live in their own collections, untouched by that reset. When the bot is kicked (`GuildDelete`; outages emit `GuildUnavailable`), the `Guild` document is deleted and settings + stats are marked `deletedAt`, then purged after 30 days by `src/core/guildLifecycle.ts` (rejoining restores them).

### MongoDB Schema (`src/database/schema/guild.ts`)

`Guild` collection, one document per Discord server (unique `guildId`, `fetchGuild` is an atomic upsert):
- `guildId` — Discord guild ID (lookup key)
- `nextSongs[]` — ordered queue of `songInterface` objects
- `previouslyPlayedSongs[]` — history (used by `/redo`)
- `currentVoiceChannel` — serialized voice channel data

All DB access goes through `src/database/queries/guilds/{get,update,delete}.ts`, `src/database/queries/settings.ts` and `src/database/queries/plays.ts`. New models must be added to the `createIndexes()` list in `databaseConnect.ts`.

### Slash Command Structure

Each slash command is a file in `src/commands/slashCommands/` exporting `data` (SlashCommandBuilder) and `execute(interaction)`. Slash commands are deployed automatically on `ClientReady` and `GuildCreate` events via `src/deploy-commands.ts`.

To add a command: create the file, export from `src/commands/slashCommands/index.ts`, and the listener + deploy are already wired.

### i18n

All user-facing strings go through `i18n.t('...')` (see `src/config/i18n.ts`). Locales are in `src/config/locales/` as JSON files (`en-US.json`, `fr-FR.json`), with the same keys in both. The locale comes from the guild context (see Per-guild settings), defaulting to `secrets.LANGUAGE`. Slash command descriptions use `setDescriptionLocalizations` (Discord client language).

When adding locale keys, they must be nested at the correct JSON path — top-level keys under `errors` won't resolve if the call uses `errors.play.missing.*`. Always verify the key path matches the nesting in the JSON file.

### Path Aliases

`tsconfig.json` maps `"paths": { "src/*": ["./src/*"] }` (TypeScript 7 removed `baseUrl`) — imports use `src/...` absolute paths (e.g. `import { client } from 'src/Bot'`). This is resolved by `tsx` at dev time and `tsup` at build time.

## Environment Variables

Copy `.env.dist` to `.env`. Required vars: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_CONNECTION_STRING`, `DATABASE_USER`, `DATABASE_PASSWORD`. Optional: `PREFIX` (default `&`), `LANGUAGE` (default `en-US`), `DETECT_FROM_ALL_MESSAGES` (default `false` — if `true`, bot plays bare YouTube links posted without prefix), `MAX_QUEUE_SIZE` (default `100`) — these four are only defaults, each server can override them with `/config`. `TIMEZONE` (default `Europe/Paris`, busiest hour in `/stats`), `DATABASE_NAME` (default `stroycord`), `LOG_DIR` (default `./logs`). `DOCKER_DATABASE_CONNECTION_STRING` (default `mongodb://mongodb:27017`, Docker only) — compose passes it to the bot as `DATABASE_CONNECTION_STRING`, so `.env` can keep a `localhost` URI for `npm run dev` (inside the container, `localhost` is the bot itself). `YOUTUBE_COOKIES_PATH` — path to a Netscape-format `cookies.txt` exported from YouTube; passed to yt-dlp for age-restricted videos. `BGUTIL_BASE_URL` — bgutil PoToken provider URL. `GLITCHTIP_DSN` / `GLITCHTIP_ENVIRONMENT` / `GLITCHTIP_RELEASE` — error reporting.

## Release Pipeline

GitHub Actions workflows chain in order: `create_tag.yml` → `build.yml` (Docker image to DockerHub as `destcom/stroycord`) → `deploy.yml` → `release.yml`. Tags are derived from the last commit message on the `release` branch.

## Gotchas

- **Docker Alpine image** needs `ffmpeg`, `python3` and `py3-pip` — yt-dlp is a pip install (see yt-dlp section). The build stage sets `YOUTUBE_DL_SKIP_DOWNLOAD=true` (youtube-dl-exec's postinstall hits GitHub API rate limits); do the same locally if `npm ci` fails on it.
- **Docker HEALTHCHECK** — the bot has no HTTP server: `src/core/healthcheck.ts` rewrites `/tmp/stroycord-healthy` every 30 s while the gateway is `Ready`; the image is unhealthy when the file is older than 90 s. Base image is pinned to `node:24-alpine3.24`, and `BGUTIL_VERSION` (Dockerfile) must match the `bgutil-provider` image tag in docker-compose.
- **Opus encoder** — `@discordjs/opus` is an `optionalDependency`: it has no prebuilt binary for Node 24 on Alpine and its source build fails on arm64 (Apple Silicon / OrbStack). When it can't install, `prism-media` falls back to `opusscript` (pure JS/WASM, pinned to `0.0.8` to match prism-media's peer range). Don't move `@discordjs/opus` back to `dependencies`.
- **`message.delete()` in `messageListener`** — always use a `DiscordAPIError`-aware catch; silently ignore codes `10008` (Unknown Message) and `50013` (Missing Permissions), log everything else.
