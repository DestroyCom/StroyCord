---
"stroycord": minor
---

Per-server configuration and listening statistics. Admins (Manage Server) configure the bot from Discord with `/config`: language, text command prefix, bare YouTube links, channels accepting commands, queue size and per-member limits (current song included), statistics on/off. Settings and statistics persist across restarts and are kept 30 days after the bot leaves a server. New `/stats` command: listening time, most played songs, artists and DJs, per member, over 7 days, 30 days or all time. New optional env vars: `MAX_QUEUE_SIZE` (default 100) and `TIMEZONE` (now used by the bot for `/stats`).
