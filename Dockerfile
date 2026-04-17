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
