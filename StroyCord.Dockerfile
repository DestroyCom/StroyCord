######### build stage
FROM node:lts-alpine AS build

WORKDIR /build
COPY package*.json ./

RUN apk update && apk add python3 make g++ ffmpeg
RUN npm ci
COPY . .

RUN npm run lint && npm run build

######### production stage
FROM node:lts-alpine
ENV NODE_ENV=production
ENV HUSKY=0

WORKDIR /app
RUN apk update && apk add python3 make g++ ffmpeg

COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./

RUN npm ci --only=production 

CMD ["npm","run","start"]