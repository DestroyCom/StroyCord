# StroyCord

---

## How to use it ?

The bot has 4 majors commands:
_You have to add your prefix before each command (e.g. `&p [music]`)_

- `play [music url or music name]` is used to start playing music (or `p`).
- `redo` is used to replay the last music played.
- `skip` is used to skip the current music (or `s`).
- `pause` is used to pause the current music (or `pa`).
- `resume` is used to resume the current music (or `re`).
- `fuckoff` disconnects the bot and stops the music playing (or `fo`).
- `queue` display the current music queue (or `q`).
- `current` displays the music currently playing (or `c`).

Every command also exists as a slash command (`/play`, `/skip`…), plus:

- `/config` (members with the _Manage Server_ permission only) opens the server settings panel: language, text command prefix, YouTube links without prefix, channels accepting commands, queue size and songs per member (the song currently playing counts in both limits), statistics on/off. Settings are stored per server and survive restarts.
- `/stats server|top|user` shows listening statistics: total listening time, most played songs, artists and DJs, busiest hour, per member, over 7 days, 30 days or all time.

---

## Deploys

**You will need a _Discord Developper Application_ !!**

### Deploy with docker and docker-compose

#### Launch with a new mongodb server, a mongodb explorer

- Clone the repository
- Rename the file `.env.dist` to `.env` and fill it with the corrects informations.
- Then simply pull the repository and run `docker-compose up -d` in the root folder.

### Launch with a custom docker config

- Clone the repository
- Rename the file `.env.dist` to `.env` and fill it with the corrects informations.
- Create your own `docker-compose.yml`.
- Then simply pull the repository and run `docker-compose up -d` in the root folder.

### Deploy on localhost

_You will need a mongodb server_
You can start this project in a few steps :

- Clone this directory,
- run the command npm install,
- Then rename the file '.env.dist' into '.env',
- Once you have your accounts and the keys, replace the variables in the '.env' with your own.

You can now launch it with the command:

- `npm run build` to compile the bot
  then `npm run start` to start the bot
- `npm run dev` to start the bot in watch mode

---

#### ENVIRONMENT VARIABLES

| VARIABLE                   | REQUIRED | DEFAULT        | USED ONLY FOR DOCKER | DESCRIPTION                                               |
| -------------------------- | -------- | -------------- | -------------------- | --------------------------------------------------------- |
| DISCORD_TOKEN              | TRUE     |                | FALSE                | string - Your discord app token                           |
| DISCORD_CLIENT_ID          | TRUE     |                | FALSE                | string - Your discord client id                           |
| PREFIX                     | FALSE    | &              | FALSE                | string - Default bot prefix (each server can change it with /config) |
| DETECT_FROM_ALL_MESSAGES   | FALSE    | false          | FALSE                | boolean - Default for playing bare YouTube links without prefix (/config) |
| MAX_QUEUE_SIZE             | FALSE    | 100            | FALSE                | number - Default queue size, current song included (/config, max 500) |
| -------------------------- | -------- | ------------   | -------------------- | ------------------------------------------                |
| DATABASE_CONNECTION_STRING | TRUE     |                | FALSE                | string - Your mongodb uri string                          |
| DATABASE_USER              | TRUE     |                | FALSE                | string - Your mongodb user name                           |
| DATABASE_PASSWORD          | TRUE     |                | FALSE                | string - Your mongodb user password                       |
| DATABASE_NAME              | FALSE    | stroycord      | FALSE                | string - Your mongodb database name                       |
| STROYCORD_LOGO             | FALSE    | StroyCord Logo | FALSE                | string - The avatar url you want to give to the bot       |
| LANGUAGE                   | FALSE    | en-US          | FALSE                | string - Default bot language, `en-US` or `fr-FR` (/config) |
| -------------------------- | -------- | ------------   | -------------------- | ------------------------------------------                |
| LOG_DIR                    | FALSE    | /log           | TRUE                 | string - Your logging directory path use for docker       |
| TIMEZONE                   | FALSE    | Europe/Paris   | FALSE                | string - Timezone of the busiest hour in /stats |
| DOCKER_DATABASE_CONNECTION_STRING | FALSE | mongodb://mongodb:27017 | TRUE | string - Mongodb uri used by the bot container (replaces DATABASE_CONNECTION_STRING in compose) |
| -------------------------- | -------- | ------------   | -------------------- | ------------------------------------------                |
| YOUTUBE_COOKIES_PATH       | FALSE    |                | FALSE                | string - Netscape cookies.txt used by yt-dlp (age-restricted videos) |
| BGUTIL_BASE_URL            | FALSE    | http://bgutil-provider:4416 (compose) | FALSE | string - bgutil PoToken provider URL used by yt-dlp |
| GLITCHTIP_DSN              | FALSE    |                | FALSE                | string - GlitchTip project DSN, enables error reporting    |
| GLITCHTIP_ENVIRONMENT      | FALSE    | NODE_ENV       | FALSE                | string - Environment name shown in GlitchTip              |
| GLITCHTIP_RELEASE          | FALSE    |                | FALSE                | string - Release name shown in GlitchTip                  |


---


#### Docker compose configuration

```yaml
services:
  stroycord:
    container_name: stroycord
    image: destcom/stroycord:latest
    build:
      context: .
      dockerfile: StroyCord.Dockerfile
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
      DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID}
      PREFIX: ${PREFIX}
      LANGUAGE: ${LANGUAGE}
      LOG_DIR: ${LOG_DIR:-./logs}
      TIMEZONE: ${TIMEZONE:-Europe/Paris}
      DATABASE_CONNECTION_STRING: ${DOCKER_DATABASE_CONNECTION_STRING:-mongodb://mongodb:27017}
      DATABASE_USER: ${DATABASE_USER}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      DATABASE_NAME: ${DATABASE_NAME}
    restart: on-failure
    volumes:
      - ${LOG_DIR:-./logs}:/app/logs
    networks:
      - default
    depends_on:
      - mongodb
  mongodb:
    container_name: mongodb
    image: mongo:latest
    restart: on-failure
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME:-root}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD:-root}
    ports:
      - ${MONGO_PORT:-27017}:27017
    volumes:
      - ${MONGO_DATA_DIR:-./mongo/data/db}:/data/db
    networks:
      - default
```

_This repo was previously JE REVIENS OF DEVILKING_
