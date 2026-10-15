FROM node:24-alpine AS build
WORKDIR /build

RUN apk add --no-cache python3 make g++

# yt-dlp is installed from PyPI in the runtime stage (pinned in .ytdlp-version):
# skip youtube-dl-exec's postinstall download (unpinned + GitHub API rate limits)
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
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
RUN YTDLP_VERSION=$(tr -d '[:space:]' < .ytdlp-version) && \
    pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]==${YTDLP_VERSION}" bgutil-ytdlp-pot-provider && \
    mkdir -p node_modules/youtube-dl-exec/bin && \
    cp "$(which yt-dlp)" node_modules/youtube-dl-exec/bin/yt-dlp && \
    chmod +x node_modules/youtube-dl-exec/bin/yt-dlp && \
    echo "yt-dlp ready: $(yt-dlp --version)" && \
    rm .ytdlp-version

USER node
CMD ["node", "dist/Bot.js"]
