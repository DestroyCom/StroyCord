# Migration youtubei.js — Design Spec

**Date:** 2026-04-17
**Branch:** feat/modernisation
**Status:** Approved

## Objectif

Remplacer les 4 dépendances YouTube dépréciées (`@distube/ytdl-core`, `@distube/ytpl`, `@distube/ytsr`, `youtube-dl-exec`) par une seule librairie : `youtubei.js` (InnerTube client). Ajouter le support cookies pour débloquer les vidéos avec restriction d'âge. Migrer Node.js 22 → 24.

## Périmètre

- Aucun changement à la `songInterface`, au schéma MongoDB, à `activePlayers`, ni au système de commandes Discord
- Seule la couche d'accès YouTube change
- Le comportement observable pour l'utilisateur final reste identique

---

## Architecture

### Nouveau fichier : `src/core/youtube.ts`

Point d'entrée unique pour tout accès YouTube. Exporte un singleton `Innertube` initialisé au démarrage.

```ts
export let youtubeClient: Innertube;

export async function initYoutubeClient(): Promise<void> {
  const cookiesPath = process.env.YOUTUBE_COOKIES_PATH;
  const cookie = cookiesPath ? parseCookiesTxt(readFileSync(cookiesPath, 'utf-8')) : undefined;
  youtubeClient = await Innertube.create({
    cookie,
    generate_session_locally: true,
  });
}
```

**Cookie optionnel :** si `YOUTUBE_COOKIES_PATH` n'est pas défini (ou fichier absent), le bot démarre normalement en mode non-authentifié. Aucune erreur au démarrage.

**Parser cookies.txt (format Netscape → HTTP header) :**
- Ignore les lignes commençant par `#` et les lignes vides
- Chaque ligne est tab-séparée : `domain | subdomains | path | secure | expiry | name | value`
- Résultat : `"name=value; name2=value2"`

**Initialisation :** `initYoutubeClient()` est appelé dans `Bot.ts` au handler `ClientReady`, avant l'enregistrement des slash commands.

---

## Fichiers modifiés

### `src/utils/songUtils.ts`

`extractSongData` utilise `youtubeClient.getBasicInfo(videoId)` :

- `basic_info.title` → `title`
- `basic_info.author` → `videoAuthor`
- `basic_info.duration` (secondes) → `minutes` / `seconds` / `videoLength`
- `basic_info.thumbnail[last].url` → `thumbnail`
- `basic_info.id` → construction de `url` (`https://www.youtube.com/watch?v={id}`)

Nouveau helper `extractVideoId(url: string): string` dans ce fichier :
- Gère `youtu.be/{id}`, `youtube.com/watch?v={id}`, et ID nu

### `src/core/requestHandlers/searchRequest.ts`

```ts
const results = await youtubeClient.search(searchInput);
const firstVideo = results.videos?.[0];
if (!firstVideo?.id) { /* sendErrorEmbed */ return; }
await songRequest(`https://www.youtube.com/watch?v=${firstVideo.id}`, ...);
```

### `src/core/requestHandlers/playlistRequest.ts`

```ts
const playlist = await youtubeClient.getPlaylist(url);
for (const video of playlist.videos) {
  if (!video.id) continue;
  await songRequest(`https://www.youtube.com/watch?v=${video.id}`, ..., true);
}
const playlistInfo: PlaylistInfo = {
  url,
  title: playlist.info.title ?? '',
  author: { name: playlist.info.author?.name ?? '' },
  items: playlist.videos.map(v => ({
    url: `https://www.youtube.com/watch?v=${v.id}`,
    thumbnail: v.thumbnails?.[0]?.url,
  })),
};
sendQueueEmbed(guildId, playlistInfo, textChannelId, requestAuthor);
```

### `src/core/player.ts`

```ts
import { Readable } from 'stream';
// ...
const webStream = await youtubeClient.download(videoId, { type: 'audio', quality: 'best' });
const nodeStream = Readable.fromWeb(webStream as ReadableStream<Uint8Array>);
const audioStream = createAudioResource(nodeStream, { inputType: StreamType.Arbitrary });
```

`videoId` est extrait de `nextSong.url` via `extractVideoId()`.

### `src/core/messages.ts` + `src/utils/embeds/listSongEmbed.ts`

- Import `ytpl` supprimé
- `ytpl.result` remplacé par `PlaylistInfo` (interface locale)

### `src/utils/interfaces.ts`

Ajout de :

```ts
export interface PlaylistInfo {
  url: string;
  title: string;
  author: { name: string };
  items: Array<{ url: string; thumbnail?: string }>;
}
```

---

## Config & environnement

### `.env.dist`

```env
# Optionnel — chemin vers un fichier cookies.txt exporté depuis YouTube
# Sans ce fichier, le bot fonctionne en mode non-authentifié (vidéos publiques seulement)
# YOUTUBE_COOKIES_PATH=./cookies.txt
```

### `secrets.ts`

Pas modifié — `YOUTUBE_COOKIES_PATH` est lu directement dans `youtube.ts` car optionnel.

### `docker-compose.yml`

```yaml
services:
  bot:
    volumes:
      - ${YOUTUBE_COOKIES_PATH:-./cookies.txt}:/app/cookies.txt:ro
    environment:
      - YOUTUBE_COOKIES_PATH=/app/cookies.txt
```

Le fichier cookies est monté en lecture seule. Si absent sur l'hôte, Docker crée un dossier vide — à gérer avec un check `existsSync` dans `youtube.ts` avant de lire le fichier.

---

## Migration Node.js 22 → 24

| Fichier | Changement |
|---|---|
| `Dockerfile` | `node:22-alpine` → `node:24-alpine` (build + runtime) |
| `.github/workflows/ci.yml` | `node-version: 22` → `node-version: 24` |
| `package.json` | Ajout `"engines": { "node": ">=24" }` |

`Readable.fromWeb()` est disponible depuis Node.js 16 — aucune incompatibilité.

---

## Dépendances

### Supprimées

```
@distube/ytdl-core
@distube/ytpl
@distube/ytsr
youtube-dl-exec
```

### Ajoutée

```
youtubei.js
```

---

## Gestion des erreurs

- Vidéo indisponible / privée / géo-bloquée → `ChildProcessError` actuelle remplacée par exception youtubei.js → capturée dans le `try/catch` de `songRequest` → `sendErrorEmbed` (comportement identique)
- Cookie expiré → les requêtes tombent en mode non-authentifié silencieusement (YouTube retourne quand même les vidéos publiques)
- `YOUTUBE_COOKIES_PATH` défini mais fichier inexistant → log warning + démarrage sans cookie

---

## Hors périmètre

- Rotation automatique des cookies
- Support YouTube Music (`yt.music.*`)
- Cache `UniversalCache` (peut être ajouté plus tard pour réduire les appels API)
