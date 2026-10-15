# Alpine release pinned (same image as node:24-alpine today); bump deliberately
FROM node:24-alpine3.24 AS build
WORKDIR /build

RUN apk add --no-cache python3 make g++

# yt-dlp is installed from PyPI in the runtime stage (pinned in .ytdlp-version):
# skip youtube-dl-exec's postinstall download (unpinned + GitHub API rate limits)
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine3.24
ENV NODE_ENV=production

WORKDIR /app
RUN apk add --no-cache ffmpeg python3 py3-pip

COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./

# ── yt-dlp ───────────────────────────────────────────────────────────────────
# Same setup as StroyGetter: pinned yt-dlp + yt-dlp-ejs (the "default" extra,
# needed with --js-runtimes node to solve YouTube's JS challenges) and the
# bgutil PoToken provider plugin. Copied where youtube-dl-exec looks for it.
COPY .ytdlp-version .ytdlp-version
# Must match the bgutil-provider image tag in docker-compose.yml
ARG BGUTIL_VERSION=2.0.2
RUN YTDLP_VERSION=$(tr -d '[:space:]' < .ytdlp-version) && \
    pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]==${YTDLP_VERSION}" "bgutil-ytdlp-pot-provider==${BGUTIL_VERSION}" && \
    mkdir -p node_modules/youtube-dl-exec/bin && \
    cp "$(which yt-dlp)" node_modules/youtube-dl-exec/bin/yt-dlp && \
    chmod +x node_modules/youtube-dl-exec/bin/yt-dlp && \
    echo "yt-dlp ready: $(yt-dlp --version)" && \
    rm .ytdlp-version

# Healthy while the bot refreshes its heartbeat file (only when connected to Discord, see src/core/healthcheck.ts)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "const s=require('fs').statSync(require('os').tmpdir()+'/stroycord-healthy');process.exit(Date.now()-s.mtimeMs<90000?0:1)"

USER node
CMD ["node", "dist/Bot.js"]
