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

A user command goes through one of two entry points in `src/listeners/messageListener.ts`:

1. **Text command** (`&play ...`) → `messageListener` parses the prefix+command, routes via `switch` to a function in `src/commands/textCommands.ts`
2. **Slash command** (`/play`) → `InteractionCreate` event routes to `src/commands/slashCommands/<name>.ts` via the `commands` map in `src/commands/slashCommands/index.ts`

Both paths ultimately call the same functions in `textCommands.ts`, which call into `src/core/requestHandlers/`.

### Play Request Handlers (`src/core/requestHandlers/`)

Three handlers resolve the input type before calling into the player:

- `songRequest.ts` — single YouTube URL → calls `ytdl.getInfo` to extract metadata → `pushSongs` to DB → `songPlayer`
- `playlistRequest.ts` — playlist URL → iterates via `ytpl`, calls `songRequest` per item
- `searchRequest.ts` — text search → `ytsr` (limit 1) → calls `songRequest` with the first result

### Player (`src/core/player.ts`)

`songPlayer(guildId)` is the core playback engine:
- Fetches the first song from MongoDB (`nextSongs[0]`)
- Joins the voice channel stored in DB
- Creates/reuses an `AudioPlayer` stored in the in-memory `activePlayers` map (exported from `Bot.ts`)
- Streams audio via yt-dlp (`src/core/ytdlp.ts`) piped to `createAudioResource`; the yt-dlp process per guild is killed on skip/stop

`activePlayers` is an in-memory map `{ [guildId]: { audioPlayer } }` — the single source of truth for whether a guild is currently playing.

### yt-dlp (`src/core/ytdlp.ts`)

Same setup as StroyGetter. `buildYtdlpArgs()` always passes `--js-runtimes node:<execPath>` — YouTube requires JS challenge solving, and without a runtime stream URLs return **HTTP 403**. In Docker, yt-dlp is installed from PyPI (`yt-dlp[default]`, includes the `yt-dlp-ejs` solver) at the version pinned in `.ytdlp-version` (bumped daily by `watch_ytdlp.yml`), along with the `bgutil-ytdlp-pot-provider` plugin, and copied over `node_modules/youtube-dl-exec/bin/yt-dlp`. Optional: `YOUTUBE_COOKIES_PATH` (copied to a writable temp file), `BGUTIL_BASE_URL` (docker-compose runs a `bgutil-provider` service).

### Error reporting (`src/config/monitoring.ts`)

GlitchTip via `@sentry/node`, enabled only when `GLITCHTIP_DSN` is set. Imported first in `Bot.ts`. Use `captureError(err, { guildId, ... })` / `captureMessage(msg, context, level)` — keep variable data (urls, ids) in the context so GlitchTip groups issues by message.

### State: In-Memory vs. Database

| State | Where |
|---|---|
| Is playing / AudioPlayer ref | `activePlayers` (in-memory, `Bot.ts`) |
| Song queue (`nextSongs`) | MongoDB `Guild` document |
| Play history (`previouslyPlayedSongs`) | MongoDB `Guild` document |
| Current voice channel | MongoDB `Guild` document |

On startup, `connectToDatabase` calls `emptyAllGuild()` — this wipes all queues and voice channel state from every guild, since in-memory `activePlayers` is always empty on a fresh start.

### MongoDB Schema (`src/database/schema/guild.ts`)

Single `Guild` collection per Discord server:
- `guildId` — Discord guild ID (lookup key)
- `nextSongs[]` — ordered queue of `songInterface` objects
- `previouslyPlayedSongs[]` — history (used by `/redo`)
- `currentVoiceChannel` — serialized voice channel data

All DB access goes through `src/database/queries/guilds/{get,update,delete}.ts`.

### Slash Command Structure

Each slash command is a file in `src/commands/slashCommands/` exporting `data` (SlashCommandBuilder) and `execute(interaction)`. Slash commands are deployed automatically on `ClientReady` and `GuildCreate` events via `src/deploy-commands.ts`.

To add a command: create the file, export from `src/commands/slashCommands/index.ts`, and the listener + deploy are already wired.

### i18n

All user-facing strings go through `i18n.t('...')` (see `src/config/i18n.ts`). Locales are in `src/config/locales/` as JSON files (`en-US.json`, `fr-FR.json`). The active locale is set from `secrets.LANGUAGE` at startup.

When adding locale keys, they must be nested at the correct JSON path — top-level keys under `errors` won't resolve if the call uses `errors.play.missing.*`. Always verify the key path matches the nesting in the JSON file.

### Path Aliases

`tsconfig.json` maps `"paths": { "src/*": ["./src/*"] }` (TypeScript 7 removed `baseUrl`) — imports use `src/...` absolute paths (e.g. `import { client } from 'src/Bot'`). This is resolved by `tsx` at dev time and `tsup` at build time.

## Environment Variables

Copy `.env.dist` to `.env`. Required vars: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_CONNECTION_STRING`, `DATABASE_USER`, `DATABASE_PASSWORD`. Optional: `PREFIX` (default `&`), `LANGUAGE` (default `en-US`), `DETECT_FROM_ALL_MESSAGES` (default `false` — if `true`, bot responds to YouTube URLs in any message without prefix), `DATABASE_NAME` (default `stroycord`), `LOG_DIR` (default `./logs`), `TIMEZONE` (default `Europe/Paris`, Docker only). `YOUTUBE_COOKIES_PATH` — path to a Netscape-format `cookies.txt` exported from YouTube; passed to yt-dlp for age-restricted videos. `BGUTIL_BASE_URL` — bgutil PoToken provider URL. `GLITCHTIP_DSN` / `GLITCHTIP_ENVIRONMENT` / `GLITCHTIP_RELEASE` — error reporting.

## Release Pipeline

GitHub Actions workflows chain in order: `create_tag.yml` → `build.yml` (Docker image to DockerHub as `destcom/stroycord`) → `deploy.yml` → `release.yml`. Tags are derived from the last commit message on the `release` branch.

## Gotchas

- **Docker Alpine image** needs `ffmpeg`, `python3` and `py3-pip` — yt-dlp is a pip install (see yt-dlp section). The build stage sets `YOUTUBE_DL_SKIP_DOWNLOAD=true` (youtube-dl-exec's postinstall hits GitHub API rate limits); do the same locally if `npm ci` fails on it.
- **Opus encoder** — `@discordjs/opus` is an `optionalDependency`: it has no prebuilt binary for Node 24 on Alpine and its source build fails on arm64 (Apple Silicon / OrbStack). When it can't install, `prism-media` falls back to `opusscript` (pure JS/WASM, pinned to `0.0.8` to match prism-media's peer range). Don't move `@discordjs/opus` back to `dependencies`.
- **`message.delete()` in `messageListener`** — always use a `DiscordAPIError`-aware catch; silently ignore codes `10008` (Unknown Message) and `50013` (Missing Permissions), log everything else.
