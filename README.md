# 🎵 StroyCord

A self-hosted Discord music bot that plays YouTube in your voice channels, with a queue, per-server settings and listening statistics.

- ▶️ Play a YouTube link, a playlist, or just a search
- ⚙️ Configure everything per server with `/config`, no restart needed
- 📊 See who listens to what with `/stats`
- 🌍 English and French

---

## 📖 Commands

Every command works as a **slash command** (`/play`) and as a **text command** with the server prefix (`&play`, default prefix `&`). Each server can disable one of the two in `/config`.

| Command | Alias | What it does |
| --- | --- | --- |
| `play <url or search>` | `p` | Play a song or playlist, or add it to the queue |
| `skip` | `s` | Skip the current song |
| `pause` | `pa` | Pause playback |
| `resume` | `re` | Resume playback |
| `queue` | `q` | Show the queue |
| `current` | `c` | Show the song currently playing |
| `redo` | | Replay the last song played |
| `fuckoff` | `fo` | Stop the music and leave the voice channel |

Two more commands are slash-only:

- **`/stats server | top | user`**: total listening time, most played songs, artists and DJs, busiest hour, per member, over 7 days, 30 days or all time.
- **`/config`** (members with the *Manage Server* permission only): opens the settings panel of the server.

> 💡 When *YouTube links without prefix* is enabled, posting a bare YouTube link is enough to play it.

### ⚙️ What `/config` can change

| Setting | Default |
| --- | --- |
| Language (`en-US`, `fr-FR`) | `LANGUAGE` from `.env` |
| Text command prefix | `PREFIX` from `.env` |
| Accepted commands: prefix & slash, prefix only, slash only | both |
| Channels accepting commands | all channels |
| Bot replies channel | the channel of the command |
| Bot replies (now playing, added, skip…). Queue, current song and errors are always shown | on |
| Play bare YouTube links without prefix | `DETECT_FROM_ALL_MESSAGES` from `.env` |
| Queue size, current song included (max 500) | `MAX_QUEUE_SIZE` from `.env` |
| Songs per member, current song included | unlimited |
| Listening statistics | on |
| Blocked roles: members with these roles get no answer at all (admins keep `/config`) | none |

Settings are stored per server and survive restarts.

---

## 🚀 Getting started

You need a [Discord application](https://discord.com/developers/applications) with a bot token.

### 🐳 With Docker (recommended)

The compose stack starts the bot, MongoDB, [mongo-express](http://localhost:8081) (database UI) and the YouTube PoToken provider.

```bash
git clone https://github.com/DestroyCom/StroyCord.git
cd StroyCord
cp .env.dist .env   # then fill in the required variables
docker compose up -d
```

<details>
<summary>Handy commands (<code>make</code> or <code>npm</code>)</summary>

| Make | npm | What it does |
| --- | --- | --- |
| `make up` | `npm run docker:up` | Start the full stack |
| `make rebuild` | `npm run docker:rebuild` | Rebuild the image and restart |
| `make logs` | `npm run docker:logs` | Follow the bot logs |
| `make down` | `npm run docker:down` | Stop the stack |
| `make test-env` | `npm run docker:test-env` | Start MongoDB + mongo-express only, for local dev |
| `make clean` | `npm run docker:clean` | Stop and **delete all data** |

On Windows, run `make` from Git Bash, or use the npm column.

</details>

### 💻 Locally

Requires Node.js 24, `ffmpeg` and a MongoDB server (`make test-env` starts one with Docker).

```bash
npm install
cp .env.dist .env   # then fill in the required variables
npm run dev         # watch mode
```

For production: `npm run build`, then `npm run start`.

---

## 🔧 Environment variables

### Required

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Your Discord application ID |
| `DATABASE_CONNECTION_STRING` | MongoDB URI, e.g. `mongodb://localhost:27017` |
| `DATABASE_USER` | MongoDB user |
| `DATABASE_PASSWORD` | MongoDB password |

### Server defaults (each server can override them with `/config`)

| Variable | Default | Description |
| --- | --- | --- |
| `PREFIX` | `&` | Text command prefix |
| `LANGUAGE` | `en-US` | `en-US` or `fr-FR` |
| `DETECT_FROM_ALL_MESSAGES` | `false` | Play bare YouTube links posted without prefix |
| `MAX_QUEUE_SIZE` | `100` | Queue size, current song included (max 500) |

### Optional

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_NAME` | `stroycord` | MongoDB database name |
| `STROYCORD_LOGO` | StroyCord logo | Image URL used in the embeds |
| `TIMEZONE` | `Europe/Paris` | Timezone of the busiest hour in `/stats` |
| `LOG_DIR` | `./logs` | Log directory |
| `YOUTUBE_COOKIES_PATH` | | YouTube `cookies.txt` (Netscape format), for age-restricted videos |
| `BGUTIL_BASE_URL` | `http://bgutil-provider:4416` in Docker | YouTube PoToken provider URL |
| `GLITCHTIP_DSN` | | Enables error reporting to GlitchTip |
| `GLITCHTIP_ENVIRONMENT` | `production` | Environment shown in GlitchTip |
| `GLITCHTIP_RELEASE` | | Release shown in GlitchTip |

### Docker only

| Variable | Default | Description |
| --- | --- | --- |
| `DOCKER_DATABASE_CONNECTION_STRING` | `mongodb://mongodb:27017` | MongoDB URI used by the bot container. It replaces `DATABASE_CONNECTION_STRING`, which can then keep a `localhost` URI for `npm run dev` |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | `root` / `root` | MongoDB root account |
| `MONGOEXPRESS_BASIC_AUTH_USERNAME` / `MONGOEXPRESS_BASIC_AUTH_PASSWORD` | `admin` / `admin123` | mongo-express login |
| `MONGO_PORT` | `27017` | MongoDB port exposed on the host |

---

## 🧪 Development

```bash
npm test               # Vitest
npm run test:coverage  # with coverage
npm run lint           # Biome, with auto-fix
npm run knip           # unused exports and files
```

---

<sub>This repo was previously <i>JE REVIENS</i> by DEVILKING.</sub>
