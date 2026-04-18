# stroycord

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
