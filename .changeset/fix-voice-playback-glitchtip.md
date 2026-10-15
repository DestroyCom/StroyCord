---
"stroycord": minor
---

Fix voice playback (yt-dlp HTTP 403): yt-dlp now uses Node.js to solve YouTube's JS challenges, is pinned and installed from PyPI in Docker with the bgutil PoToken plugin, and uses cookies when `YOUTUBE_COOKIES_PATH` is set. YouTube's WebM/Opus audio is now sent to Discord without re-encoding. Add optional GlitchTip error reporting (`GLITCHTIP_DSN`).
