# stroycord

## 1.8.0

### Minor Changes

- ad8f3b8: Queue editing: `/priority` (`&pr <n>`) plays a waiting song right after the current one, `/clearplaylist` (`&cp [n]`) removes the waiting songs of one playlist without stopping the current song. Both slash commands autocomplete from the queue, and `/queue` shows which playlist each song comes from.
- 2169857: SoundCloud support (tracks, sets / albums, private and short links; Go+ tracks, only available as 30 s previews, are refused instead of played cut) and working YouTube playlists: the playlist id is now passed to YouTube (the full URL made every playlist fail), every page is read (not only the first 100 videos) and a playlist that can't be loaded is reported. A video carrying its auto-generated mix (`list=RD…`) plays alone instead of queueing the radio.

## 1.7.0

### Minor Changes

- 0984a26: More `/config` settings. A bot replies channel, where the bot posts its messages instead of the channel of the command (errors stay in the command channel). A switch to turn off the bot replies (now playing, added, skip, pause…), the queue, current song and errors are still shown. A command mode to accept prefix commands, slash commands or both (`/config` and `/stats` always stay available). Blocked roles: members with these roles get no answer at all, admins keep access to `/config`.
- e245c03: Per-server configuration and listening statistics. Admins (Manage Server) configure the bot from Discord with `/config`: language, text command prefix, bare YouTube links, channels accepting commands, queue size and per-member limits (current song included), statistics on/off. Settings and statistics persist across restarts and are kept 30 days after the bot leaves a server. New `/stats` command: listening time, most played songs, artists and DJs, per member, over 7 days, 30 days or all time. New optional env vars: `MAX_QUEUE_SIZE` (default 100) and `TIMEZONE` (now used by the bot for `/stats`).

## 1.6.0

### Minor Changes

- 362f950: Fix voice playback (yt-dlp HTTP 403): yt-dlp now uses Node.js to solve YouTube's JS challenges, is pinned and installed from PyPI in Docker with the bgutil PoToken plugin, and uses cookies when `YOUTUBE_COOKIES_PATH` is set. YouTube's WebM/Opus audio is now sent to Discord without re-encoding. Add optional GlitchTip error reporting (`GLITCHTIP_DSN`).

## 1.5.3

### Patch Changes

- 3121112: Fix missing i18n translation paths for voiceChannelNotFound and related keys (moved under errors.arguments to match slash command references). Add python3 to Docker production image so yt-dlp can execute. Silence message.delete() permission errors when bot lacks MANAGE_MESSAGES.

## 1.5.2

### Patch Changes

- 9a1adf1: Fix message listener processing unrelated messages when DETECT_FROM_ALL_MESSAGES is set. Parse env var as boolean properly (string "false" no longer treated as truthy). Only delete messages for recognized commands.

## 1.5.1

### Patch Changes

- c0ac7b1: Fix InteractionNotReplied crash on slash commands (skip, pause, resume, redo, current, remove, queue) by awaiting `interaction.reply()` before calling `interaction.deleteReply()`.

## 1.5.0

### Minor Changes

- Migrate audio streaming to yt-dlp and add operational improvements.

  **Audio streaming**

  - Replace youtubei.js streaming with yt-dlp subprocess — works around YouTube BotGuard/PoToken restrictions that broke WEB client streaming
  - youtubei.js is kept for metadata only (search, playlist, video info)

  **Error handling**

  - Notify the Discord channel when a video is unavailable or yt-dlp fails
  - Fix `sendErrorEmbed` to fetch channels from API when not in Discord cache

  **CI & quality**

  - Add functional smoke tests that hit real YouTube (youtubei.js metadata + yt-dlp stream bytes)
  - Add weekly scheduled CI workflow (unit tests, smoke tests, build check)
  - Update Dependabot to track current critical dependencies
