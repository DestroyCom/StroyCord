######### build stage
FROM node:lts-alpine as build

WORKDIR /build
COPY package*.json ./

RUN apk update && apk add python3 make g++
RUN npm ci
COPY . .

RUN npm run lint && npm run build

######### production stage
FROM node:lts-alpine
ENV NODE_ENV=production

WORKDIR /app
RUN apk update && apk add python3 make g++

COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./

RUN npm ci --only=production --ignore-scripts

CMD ["npm","run","start"]