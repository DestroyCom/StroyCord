# StroyCord Modernisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remettre StroyCord en état de marche en modernisant la stack complète — dépendances, tooling (Biome + Lefthook), qualité de code, et ajout d'une suite de tests — en une passe propre sur une base non fonctionnelle.

**Architecture:** Approche C validée — packages d'abord, adaptation aux breaking changes, refacto code, migration tooling, puis ajout des tests. On utilise Context7 MCP pour consulter les docs des packages avant d'adapter le code. La compilation TypeScript (`npx tsc --noEmit`) et les tests Vitest servent de filets de sécurité.

**Tech Stack:** TypeScript, discord.js, @discordjs/voice, @distube/ytdl-core + ytsr + ytpl, youtube-dl-exec, mongoose, BiomeJS, Lefthook, tsx, tsup, Vitest, mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-04-17-modernisation-stroycord-design.md`

---

## File Map

### Fichiers supprimés
- `.eslintrc.js`
- `.eslintignore`
- `.prettierrc`
- `.husky/` (dossier entier)
- `src/utils/utils.ts` (remplacé par trois fichiers dédiés)
- `src/listeners/playerListerners.ts` (renommé + enrichi)

### Fichiers créés
- `biome.json`
- `lefthook.yml`
- `scripts/commit-msg.sh` — validation conventional commits (remplace commitlint)
- `vitest.config.ts`
- `src/utils/songUtils.ts` — `extractSongData`, `extractVoiceChannelData`
- `src/utils/youtubeUtils.ts` — `yt_validate`, `getAudioStream`
- `src/utils/messageUtils.ts` — `messageFormater`
- `src/listeners/playerListeners.ts` — contenu de `playerListerners.ts` + `voiceConnectionErrorListener`
- `src/tests/unit/youtubeUtils.test.ts`
- `src/tests/unit/messageUtils.test.ts`
- `src/tests/unit/songRequest.test.ts`
- `src/tests/integration/guilds.test.ts`

### Fichiers modifiés

- `package.json` — versions, scripts, suppression husky block, ajout vitest + mongodb-memory-server, suppression commitlint
- `src/core/requestHandlers/songRequest.ts` — logique simplifiée + try/catch
- `src/core/requestHandlers/searchRequest.ts` — guard sur résultats vides
- `src/core/player.ts` — erreur stream + imports mis à jour
- `src/core/messages.ts` — ajout `sendErrorEmbed`
- `src/listeners/errorListeners.ts` — suppression `voiceConnectionErrorListener`
- `src/listeners/messageListener.ts` — imports mis à jour
- `src/database/databaseConnect.ts` — mongoose 9 breaking changes
- `src/database/schema/guild.ts` — mongoose 9 breaking changes
- Tous les fichiers qui importaient depuis `src/utils/utils` ou `src/listeners/playerListerners`

---

## Task 1: Audit des versions latest

**Files:**
- Read: `package.json`

- [ ] **Step 1: Vérifier les versions latest de chaque dépendance runtime**

```bash
npm show discord.js version
npm show @discordjs/voice version
npm show @discordjs/opus version
npm show @distube/ytdl-core version
npm show @distube/ytpl version
npm show @distube/ytsr version
npm show mongoose version
npm show mongodb version
npm show youtube-dl-exec version
npm show i18n-js version
npm show axios version
npm show dotenv version
npm show libsodium-wrappers version
```

- [ ] **Step 2: Vérifier les versions latest des devDeps à conserver**

```bash
npm show tsx version
npm show tsup version
npm show typescript version
npm show knip version
npm show @commitlint/cli version
npm show @commitlint/config-conventional version
npm show @types/node version
npm show @biomejs/biome version
npm show lefthook version
```

- [ ] **Step 3: Noter les versions trouvées**

Garder les résultats — ils seront utilisés dans Task 2 pour remplir `package.json`.

---

## Task 2: Mise à jour package.json + création tooling + npm install

**Files:**
- Modify: `package.json`
- Create: `biome.json`
- Create: `lefthook.yml`
- Delete: `.eslintrc.js`, `.eslintignore`, `.prettierrc`, `.husky/`

- [ ] **Step 1: Réécrire package.json avec les versions auditées**

Remplacer le contenu complet de `package.json` (remplir les `<VERSION>` avec les valeurs de Task 1) :

```json
{
  "name": "stroycord",
  "version": "1.4.0",
  "description": "A discord bot to play music in VC",
  "main": "src/Bot.ts",
  "scripts": {
    "dev": "tsx watch ./src/Bot.ts",
    "start": "node ./dist/Bot.js",
    "build": "npm run lint && tsup ./src/Bot.ts --minify",
    "lint": "biome check --write .",
    "knip": "knip"
  },
  "author": "Dest.Com",
  "license": "GPL-3.0",
  "dependencies": {
    "@discordjs/opus": "<VERSION>",
    "@discordjs/voice": "<VERSION>",
    "@distube/ytdl-core": "<VERSION>",
    "@distube/ytpl": "<VERSION>",
    "@distube/ytsr": "<VERSION>",
    "axios": "<VERSION>",
    "discord.js": "<VERSION>",
    "dotenv": "<VERSION>",
    "i18n-js": "<VERSION>",
    "libsodium-wrappers": "<VERSION>",
    "mongodb": "<VERSION>",
    "mongoose": "<VERSION>",
    "youtube-dl-exec": "<VERSION>"
  },
  "devDependencies": {
    "@biomejs/biome": "<VERSION>",
    "@types/node": "<VERSION>",
    "@vitest/coverage-v8": "<VERSION>",
    "knip": "<VERSION>",
    "lefthook": "<VERSION>",
    "mongodb-memory-server": "<VERSION>",
    "tsup": "<VERSION>",
    "tsx": "<VERSION>",
    "typescript": "<VERSION>",
    "vitest": "<VERSION>"
  }
}
```

La section `overrides` pour `discord-api-types` est supprimée — elle n'est plus nécessaire avec les versions récentes.

- [ ] **Step 2: Créer `biome.json`**

Consulter Context7 pour la config Biome courante avant de créer le fichier :
```
mcp__plugin_context7_context7__resolve-library-id: "biomejs/biome"
mcp__plugin_context7_context7__query-docs: topic "configuration biome.json schema formatter linter organizeImports"
```

Créer `biome.json` à la racine :

```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "files": {
    "ignore": ["dist/", "node_modules/"]
  }
}
```

Si la version installée de Biome a un schéma différent (ex: Biome 2.x), ajuster les clés selon Context7.

- [ ] **Step 3: Créer `scripts/commit-msg.sh`**

Créer le répertoire `scripts/` et le fichier `scripts/commit-msg.sh` :

```bash
#!/usr/bin/env bash

MSG_PATH="$1"

if [ -z "$MSG_PATH" ]; then
  echo "Chemin du fichier de commit non spécifié" >&2
  exit 1
fi

message=$(tr -d '\n' < "$MSG_PATH")

commit_regex='^(feat|fix|chore|ci|docs|style|refactor|test|build|perf|revert)(\([a-z0-9-]+\))?: .+$'

if [[ "$message" =~ $commit_regex ]]; then
  exit 0
else
  cat << 'EOF' >&2
❌ Mauvais format de commit (conventional commits).

Exemples valides :
  feat: add queue command
  fix(player): handle undefined stream
  chore: update dependencies
EOF
  exit 1
fi
```

Rendre le script exécutable :

```bash
chmod +x scripts/commit-msg.sh
```

- [ ] **Step 4: Créer `lefthook.yml`**

```yaml
pre-commit:
  commands:
    lint:
      run: npx biome check --write .

commit-msg:
  commands:
    validate:
      run: bash scripts/commit-msg.sh {1}
```

- [ ] **Step 4: Supprimer les anciens fichiers tooling**

```bash
rm .eslintrc.js .eslintignore .prettierrc
rm -rf .husky
```

- [ ] **Step 5: npm install propre**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: installation sans erreurs, plus de "UNMET DEPENDENCY" ni "missing".

- [ ] **Step 6: Vérifier que les dépendances sont propres**

```bash
npm list --depth=0 2>&1 | grep -E "UNMET|missing|invalid"
```

Expected: aucune ligne affichée.

- [ ] **Step 7: Installer lefthook hooks**

```bash
npx lefthook install
```

- [ ] **Step 8: Commit**

```bash
git add package.json biome.json lefthook.yml
git commit -m "chore: migrate to biome + lefthook, update all dependencies"
```

---

## Task 3: Fix breaking changes — @discordjs/voice

**Files:**
- Modify: `src/core/player.ts`
- Modify: `src/listeners/playerListerners.ts`

- [ ] **Step 1: Consulter Context7 pour @discordjs/voice**

```
mcp__plugin_context7_context7__resolve-library-id: "@discordjs/voice"
mcp__plugin_context7_context7__query-docs: topic "AudioPlayer AudioPlayerStatus stateChange migration breaking changes"
```

- [ ] **Step 2: Vérifier si AudioPlayerStatus est maintenant un enum obligatoire**

Dans `src/listeners/playerListerners.ts`, le code compare des string literals :

```ts
if (newState.status === 'idle' && oldState.status === 'playing') { ... }
if (newState.status === 'playing' && oldState.status === 'buffering') { ... }
```

Dans `src/core/player.ts` :
```ts
if (activePlayers[guildId].audioPlayer.state.status !== 'playing') return;
if (activePlayers[guildId].audioPlayer.state.status !== 'paused') return;
```

Si la nouvelle version exige l'enum `AudioPlayerStatus`, remplacer :

```ts
import { AudioPlayerStatus } from '@discordjs/voice';

// Dans playerListerners.ts :
if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing)
if (newState.status === AudioPlayerStatus.Playing && oldState.status === AudioPlayerStatus.Buffering)

// Dans player.ts :
if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Playing) return;
if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Paused) return;
```

Si les string literals compilent encore sans erreur TypeScript, laisser tel quel.

- [ ] **Step 3: Vérifier les autres APIs utilisées dans `src/core/player.ts`**

Confirmer avec Context7 que ces appels sont toujours valides :
- `joinVoiceChannel({ channelId, guildId, adapterCreator })`
- `createAudioPlayer()`
- `createAudioResource(stream, { inputType: StreamType.Arbitrary })`
- `connection.subscribe(audioPlayer)`
- `getVoiceConnection(guildId)?.disconnect()` / `.destroy()`

Adapter si nécessaire selon la doc Context7.

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

Corriger toutes les erreurs liées à `@discordjs/voice`.

- [ ] **Step 5: Commit**

```bash
git add src/core/player.ts src/listeners/playerListerners.ts
git commit -m "fix: adapt code to @discordjs/voice breaking changes"
```

---

## Task 4: Fix breaking changes — discord.js

**Files:**
- Modify: `src/Bot.ts`
- Modify: `src/listeners/messageListener.ts`
- Modify: `src/listeners/errorListeners.ts`
- Modify: `src/deploy-commands.ts`
- Modify: `src/core/messages.ts`

- [ ] **Step 1: Consulter Context7 pour discord.js**

```
mcp__plugin_context7_context7__resolve-library-id: "discordjs/discord.js"
mcp__plugin_context7_context7__query-docs: topic "migration breaking changes GatewayIntentBits Events Client TextChannel isChatInputCommand"
```

- [ ] **Step 2: Vérifier `interaction.isCommand()` dans `src/listeners/messageListener.ts`**

Code actuel :
```ts
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
```

Dans les versions récentes de discord.js, `isCommand()` est déprécié au profit de `isChatInputCommand()`. Si Context7 confirme, remplacer par :

```ts
if (!interaction.isChatInputCommand()) {
  return;
}
```

- [ ] **Step 3: Vérifier les intents dans `src/Bot.ts`**

Code actuel :
```ts
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
]
```

Vérifier avec Context7 si des intents ont été ajoutés, supprimés ou renommés. Adapter si nécessaire.

- [ ] **Step 4: Vérifier le pattern TextChannel cast dans `src/core/messages.ts`**

Pattern actuel :
```ts
const messageChannel = await client.guilds
  .fetch(guildId)
  .then((guild) => guild.channels.cache.get(currentSong.requestChannel));
return await (messageChannel as TextChannel)?.send({ embeds: [embed] });
```

Si ce pattern est déprécié selon Context7, adapter. Sinon laisser tel quel.

- [ ] **Step 5: Appliquer les corrections identifiées et compile check**

```bash
npx tsc --noEmit
```

Corriger toutes les erreurs liées à discord.js.

- [ ] **Step 6: Commit**

```bash
git add src/Bot.ts src/listeners/messageListener.ts src/listeners/errorListeners.ts src/deploy-commands.ts src/core/messages.ts
git commit -m "fix: adapt code to discord.js breaking changes"
```

---

## Task 5: Fix breaking changes — mongoose 8

**Files:**
- Modify: `src/database/databaseConnect.ts`
- Modify: `src/database/schema/guild.ts`
- Modify: `src/database/queries/guilds/get.ts`
- Modify: `src/database/queries/guilds/update.ts`
- Modify: `src/database/queries/guilds/delete.ts`

- [ ] **Step 1: Consulter Context7 pour mongoose 8**

```
mcp__plugin_context7_context7__resolve-library-id: "Automattic/mongoose"
mcp__plugin_context7_context7__query-docs: topic "migration guide v7 to v8 breaking changes connect strictQuery Schema"
```

- [ ] **Step 2: Vérifier `databaseConnect.ts`**

Code actuel (`.then().catch()` sur `mongoose.connect()`) — dans mongoose 8 ce pattern reste valide. Si Context7 indique un changement, réécrire en async/await pur :

```ts
export const connectToDatabase = async () => {
  try {
    await mongoose.connect(secrets.DATABASE_CONNECTION_STRING, {
      dbName: secrets.DATABASE_NAME,
      authSource: 'admin',
      user: secrets.DATABASE_USER,
      pass: secrets.DATABASE_PASSWORD,
    });
    await emptyAllGuild();
  } catch (error) {
    console.log('Error connecting to database !');
    process.exit(0);
  }
};
```

- [ ] **Step 3: Vérifier le schéma dans `src/database/schema/guild.ts`**

Les types `Object` et `Array` sont utilisés actuellement. Si mongoose 8 les a dépréciés selon Context7, remplacer par `mongoose.Schema.Types.Mixed` et `[mongoose.Schema.Types.Mixed]`.

- [ ] **Step 4: Vérifier les queries**

Les méthodes `findOne`, `updateOne`, `updateMany`, `deleteOne` et `save()` sont stables. Confirmer que `$pop: { nextSongs: -1 }` dans `shiftSongs` reste supporté (retire le premier élément de l'array).

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Corriger toutes les erreurs liées à mongoose.

- [ ] **Step 6: Commit**

```bash
git add src/database/
git commit -m "fix: adapt code to mongoose 8 breaking changes"
```

---

## Task 6: Fix breaking changes — @distube/* et youtube-dl-exec

**Files:**
- Modify: `src/utils/utils.ts`
- Modify: `src/core/player.ts`
- Modify: `src/core/requestHandlers/playlistRequest.ts`
- Modify: `src/core/requestHandlers/searchRequest.ts`
- Modify: `src/core/messages.ts`

- [ ] **Step 1: Consulter Context7 pour @distube/ytdl-core**

```
mcp__plugin_context7_context7__resolve-library-id: "@distube/ytdl-core"
mcp__plugin_context7_context7__query-docs: topic "getInfo videoDetails breaking changes migration"
```

Vérifier que `ytdl.getInfo(url)` retourne toujours un objet avec `videoDetails.title`, `videoDetails.author.name`, `videoDetails.lengthSeconds`, `videoDetails.video_url`, `videoDetails.thumbnails`.

- [ ] **Step 2: Consulter Context7 pour @distube/ytsr**

```
mcp__plugin_context7_context7__resolve-library-id: "@distube/ytsr"
mcp__plugin_context7_context7__query-docs: topic "search items Video url breaking changes"
```

Vérifier que `ytsr(searchInput, { limit: 1 })` retourne `{ items: [{ url: string }] }`.

- [ ] **Step 3: Consulter Context7 pour @distube/ytpl**

```
mcp__plugin_context7_context7__resolve-library-id: "@distube/ytpl"
mcp__plugin_context7_context7__query-docs: topic "playlist result items breaking changes"
```

Vérifier l'API `ytpl.result` dans `src/core/messages.ts` et `src/core/requestHandlers/playlistRequest.ts`.

- [ ] **Step 4: Consulter Context7 pour youtube-dl-exec**

```
mcp__plugin_context7_context7__resolve-library-id: "youtube-dl-exec"
mcp__plugin_context7_context7__query-docs: topic "options format output stdout breaking changes"
```

Vérifier que la méthode `ytdl.exec` avec les options `{ format: 'ba', output: '-', noCheckCertificates: true, noWarnings: true, preferFreeFormats: true, addHeader: [...] }` retourne toujours un objet avec un champ `.stdout` dans `src/core/player.ts`.

- [ ] **Step 5: Appliquer les corrections identifiées**

Adapter chaque fichier selon les breaking changes trouvés. Si l'API est inchangée, ne pas modifier.

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 7: Commit**

```bash
git add src/utils/utils.ts src/core/player.ts src/core/requestHandlers/
git commit -m "fix: adapt code to @distube/* and youtube-dl-exec breaking changes"
```

---

## Task 7: Refactorisation — simplification songRequest.ts

**Files:**
- Modify: `src/core/requestHandlers/songRequest.ts`

- [ ] **Step 1: Remplacer la logique dupliquée**

Code actuel dans `src/core/requestHandlers/songRequest.ts` :

```ts
if (!activePlayerGuild && !isComingFromPlaylist) {
  await songPlayer(guildId);
} else if (!activePlayerGuild && isComingFromPlaylist) {
  await songPlayer(guildId);
} else if (!isComingFromPlaylist) {
  const isNewSong = !activePlayerGuild;
  await sendEmbed(guildId, isNewSong, false);
}
```

Remplacer par :

```ts
if (!activePlayerGuild) {
  await songPlayer(guildId);
} else if (!isComingFromPlaylist) {
  await sendEmbed(guildId, false, false);
}
```

`isNewSong` dans la branche `else if` était toujours `false` (activePlayerGuild est truthy dans ce cas).

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/core/requestHandlers/songRequest.ts
git commit -m "refactor: simplify duplicate if/else in songRequest"
```

---

## Task 8: Gestion d'erreurs — sendErrorEmbed + guards + try/catch

**Files:**
- Modify: `src/core/messages.ts`
- Modify: `src/utils/utils.ts`
- Modify: `src/core/requestHandlers/songRequest.ts`
- Modify: `src/core/requestHandlers/searchRequest.ts`
- Modify: `src/core/player.ts`

- [ ] **Step 1: Ajouter `sendErrorEmbed` dans `src/core/messages.ts`**

Ajouter l'import en haut du fichier (après les imports existants) :

```ts
import { unknownError } from 'src/utils/embeds/errorsEmbed';
```

Ajouter la fonction en bas du fichier :

```ts
export const sendErrorEmbed = async (guildId: string, textChannelId: string, errorMsg: string) => {
  const messageChannel = await client.guilds
    .fetch(guildId)
    .then((guild) => guild.channels.cache.get(textChannelId));

  return await (messageChannel as TextChannel)?.send({
    embeds: [unknownError(errorMsg)],
  });
};
```

- [ ] **Step 2: Ajouter try/catch dans `extractSongData` (`src/utils/utils.ts`)**

Remplacer la ligne `const info = await ytdl.getInfo(url);` par :

```ts
let info;
try {
  info = await ytdl.getInfo(url);
} catch (e) {
  throw new Error(`Failed to fetch video info: ${String(e)}`);
}
```

Adapter le reste du corps de la fonction pour utiliser `info` (au lieu d'une déclaration `const`).

- [ ] **Step 3: Entourer le corps de `songRequest` d'un try/catch**

Dans `src/core/requestHandlers/songRequest.ts`, modifier l'import de messages :

```ts
import { sendEmbed, sendErrorEmbed } from '../messages';
```

Entourer le corps de la fonction d'un try/catch :

```ts
export const songRequest = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null,
  isComingFromPlaylist: boolean = false
) => {
  const activePlayerGuild = activePlayers[guildId];

  try {
    const parsedSong = await extractSongData(url, requestAuthor, textChannelId, !activePlayerGuild, isComingFromPlaylist);
    const parsedVoiceChannel = await extractVoiceChannelData(voiceChannel!);

    await pushSongs(guildId, [parsedSong]);
    await updateVoiceChannel(guildId, parsedVoiceChannel);

    if (!activePlayerGuild) {
      await songPlayer(guildId);
    } else if (!isComingFromPlaylist) {
      await sendEmbed(guildId, false, false);
    }
  } catch (error) {
    await sendErrorEmbed(guildId, textChannelId, String(error));
  }
};
```

- [ ] **Step 4: Ajouter un guard dans `searchRequest.ts`**

Remplacer le contenu de `src/core/requestHandlers/searchRequest.ts` par :

```ts
import ytsr from '@distube/ytsr';
import { User, VoiceBasedChannel } from 'discord.js';
import { sendErrorEmbed } from 'src/core/messages';

import { songRequest } from './songRequest';

export const searchSong = async (
  searchInput: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const searchedVideo = await ytsr(searchInput, { limit: 1 });
  const video = searchedVideo.items[0];

  if (!video) {
    await sendErrorEmbed(guildId, textChannelId, 'No results found for: ' + searchInput);
    return;
  }

  await songRequest(video.url, guildId, requestAuthor, textChannelId, voiceChannel);
};
```

- [ ] **Step 5: Corriger le stream undefined dans `player.ts`**

Dans `src/core/player.ts`, ajouter l'import :

```ts
import { sendErrorEmbed } from 'src/core/messages';
```

Remplacer le bloc existant :

```ts
if (!stream) {
  console.log('Stream is undefined');
  return;
}
```

Par :

```ts
if (!stream) {
  await sendErrorEmbed(guildId, nextSong.requestChannel, 'Failed to create audio stream for: ' + nextSong.title);
  return;
}
```

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 7: Commit**

```bash
git add src/core/messages.ts src/utils/utils.ts src/core/requestHandlers/songRequest.ts src/core/requestHandlers/searchRequest.ts src/core/player.ts
git commit -m "feat: add error handling to song pipeline (sendErrorEmbed, guards, try/catch)"
```

---

## Task 9: Split utils.ts en songUtils.ts + youtubeUtils.ts + messageUtils.ts

**Files:**
- Create: `src/utils/songUtils.ts`
- Create: `src/utils/youtubeUtils.ts`
- Create: `src/utils/messageUtils.ts`
- Delete: `src/utils/utils.ts`
- Modify: `src/listeners/messageListener.ts`
- Modify: `src/core/requestHandlers/songRequest.ts`

- [ ] **Step 1: Créer `src/utils/songUtils.ts`**

```ts
import ytdl from '@distube/ytdl-core';
import { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';

import { songInterface } from './interfaces';

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  let info;
  try {
    info = await ytdl.getInfo(url);
  } catch (e) {
    throw new Error(`Failed to fetch video info: ${String(e)}`);
  }

  const rawSongData = info.videoDetails;
  const title = rawSongData.title || '';
  const videoAuthor = rawSongData.author?.name || '';
  const minutes = Math.floor(Number(rawSongData.lengthSeconds) / 60);
  const seconds = Number(rawSongData.lengthSeconds) % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  return {
    title,
    url: rawSongData.video_url,
    thumbnail: rawSongData.thumbnails[rawSongData.thumbnails.length - 1].url,
    videoAuthor,
    videoLength: minutes === 0 && seconds === 0 ? '`Livestream`' : formattedTime,
    minutes,
    seconds,
    requestDateTimestamp: Date.now(),
    requestAuthor: {
      id: Author.id,
      username: Author.username,
    },
    requestChannel,
    isQueueStart,
    isComingFromPlaylist,
  };
};

export const extractVoiceChannelData = async (
  voiceChannel: VoiceBasedChannel
): Promise<{
  channelId: string;
  guildId: string;
  guild: Guild;
  adapterCreator: InternalDiscordGatewayAdapterCreator;
}> => {
  return {
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    guild: voiceChannel.guild,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  };
};
```

- [ ] **Step 2: Créer `src/utils/youtubeUtils.ts`**

Note: les backslashes inutiles dans les regex originales (`\-`, `\&`) sont corrigés ici.

```ts
import axios from 'axios';

const video_id_pattern = /^[a-zA-Z\d_-]{11,12}$/;
const playlist_id_pattern = /^(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}$/;
const video_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|shorts\/|embed\/|live\/|v\/)?)([\w-]+)(\S+)?$/;
const playlist_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))\/(?:(playlist|watch))?(.*)?((\?|&)list=)(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}(&.*)?$/;

export function yt_validate(url: string): 'playlist' | 'video' | 'search' | false {
  const url_ = url.trim();
  if (url_.indexOf('list=') === -1) {
    if (url_.startsWith('https')) {
      if (url_.match(video_pattern)) {
        let id: string;
        if (url_.includes('youtu.be/')) id = url_.split('youtu.be/')[1].split(/(\?|\/|&)/)[0];
        else if (url_.includes('youtube.com/embed/'))
          id = url_.split('youtube.com/embed/')[1].split(/(\?|\/|&)/)[0];
        else if (url_.includes('youtube.com/shorts/'))
          id = url_.split('youtube.com/shorts/')[1].split(/(\?|\/|&)/)[0];
        else id = url_.split('watch?v=')[1]?.split(/(\?|\/|&)/)[0];
        if (id?.match(video_id_pattern)) return 'video';
        else return false;
      } else return false;
    } else {
      if (url_.match(video_id_pattern)) return 'video';
      else if (url_.match(playlist_id_pattern)) return 'playlist';
      else return 'search';
    }
  } else {
    if (!url_.match(playlist_pattern)) return yt_validate(url_.replace(/(\?|&)list=[^&]*/, ''));
    else return 'playlist';
  }
}

export async function getAudioStream(url: string) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return response.data;
}
```

- [ ] **Step 3: Créer `src/utils/messageUtils.ts`**

```ts
import { secrets } from '../config/secrets';

import { MessageFormaterInterface } from './interfaces';

export const messageFormater = (message: string): MessageFormaterInterface => {
  return {
    splittedMessage: message.split(' '),
    command: message.split(' ')[0].slice(secrets.PREFIX.length),
  };
};
```

- [ ] **Step 4: Mettre à jour les imports dans les fichiers concernés**

Dans `src/listeners/messageListener.ts`, remplacer :
```ts
import { messageFormater, yt_validate } from 'src/utils/utils';
```
Par :
```ts
import { messageFormater } from 'src/utils/messageUtils';
import { yt_validate } from 'src/utils/youtubeUtils';
```

Dans `src/core/requestHandlers/songRequest.ts`, remplacer :
```ts
import { extractSongData, extractVoiceChannelData } from 'src/utils/utils';
```
Par :
```ts
import { extractSongData, extractVoiceChannelData } from 'src/utils/songUtils';
```

Vérifier qu'aucun autre fichier n'importe depuis `utils` :
```bash
grep -r "from 'src/utils/utils'" src/
grep -r "from '../utils'" src/
grep -r "from '../../utils'" src/
```

Mettre à jour chaque import trouvé vers le fichier approprié.

- [ ] **Step 5: Supprimer `src/utils/utils.ts`**

```bash
rm src/utils/utils.ts
```

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs — tous les imports résolus.

- [ ] **Step 7: Commit**

```bash
git add src/utils/ src/listeners/messageListener.ts src/core/requestHandlers/songRequest.ts
git commit -m "refactor: split utils.ts into songUtils, youtubeUtils, messageUtils"
```

---

## Task 10: Découplage voiceConnectionErrorListener + renommage playerListerners

**Files:**
- Create: `src/listeners/playerListeners.ts`
- Delete: `src/listeners/playerListerners.ts`
- Modify: `src/listeners/errorListeners.ts`
- Modify: `src/core/player.ts`

- [ ] **Step 1: Créer `src/listeners/playerListeners.ts`**

Ce fichier reprend le contenu de `playerListerners.ts` ET absorbe `voiceConnectionErrorListener` depuis `errorListeners.ts`. Si Task 3 a introduit l'enum `AudioPlayerStatus`, adapter les string literals en conséquence.

```ts
import { AudioPlayer, getVoiceConnection } from '@discordjs/voice';
import { sendEmbed } from 'src/core/messages';
import { remove, skipSong } from 'src/core/player';
import { shiftSongs } from 'src/database/queries/guilds/update';

export const createAudioPlayerListener = (audioPlayer: AudioPlayer, guildId: string) => {
  audioPlayer.on('stateChange', async (oldState, newState) => {
    if (newState.status === 'idle' && oldState.status === 'playing') {
      skipSong(guildId);
      return;
    } else if (newState.status === 'playing' && oldState.status === 'buffering') {
      sendEmbed(guildId);
      return;
    }
  });

  audioPlayer.on('error', (error: unknown) => {
    try {
      remove(guildId);
    } catch (errorCatch: unknown) {
      console.error('error', error);
      console.error('errorCatch', errorCatch);
    }
  });
};

export const removeAllAudioPlayerListener = (audioPlayer: AudioPlayer) => {
  audioPlayer.removeAllListeners();
};

export const voiceConnectionErrorListener = (guildId: string) => {
  getVoiceConnection(guildId)?.on('error', async () => {
    console.log(`An error occured in voice connection for guild ${guildId}`);
    await remove(guildId);
  });

  getVoiceConnection(guildId)?.on('stateChange', async (_, newState) => {
    if (newState.status === 'disconnected') {
      console.log(`Voice connection has been destroyed for guild ${guildId}`);
      await shiftSongs(guildId);
      await remove(guildId);
    }
  });
};
```

Note: `any` remplacé par `unknown` pour satisfaire le linter Biome.

- [ ] **Step 2: Nettoyer `src/listeners/errorListeners.ts`**

Supprimer `voiceConnectionErrorListener` et l'import `getVoiceConnection`. Le fichier devient :

```ts
import { Client, Events, Guild } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { remove } from 'src/core/player';
import { emptyAllGuild, removeGuild } from 'src/database/queries/guilds/delete';

import { removeAllAudioPlayerListener } from './playerListeners';

export default (client: Client): void => {
  client.on(Events.Error, async () => {
    console.log('An error occured');
    await emptyAllGuild();
    for (const guildId in activePlayers) {
      await removeAllAudioPlayerListener(activePlayers[guildId].audioPlayer);
      await remove(guildId);
    }
  });

  client.on(Events.GuildDelete, async (guild: Guild) => {
    console.log(`Bot has been kicked from ${guild.name} (id:${guild.id})`);
    await remove(guild.id);
    await removeGuild(guild.id);
  });
};
```

- [ ] **Step 3: Mettre à jour les imports dans `src/core/player.ts`**

Remplacer :
```ts
import { voiceConnectionErrorListener } from 'src/listeners/errorListeners';
import { createAudioPlayerListener, removeAllAudioPlayerListener } from 'src/listeners/playerListerners';
```
Par :
```ts
import {
  createAudioPlayerListener,
  removeAllAudioPlayerListener,
  voiceConnectionErrorListener,
} from 'src/listeners/playerListeners';
```

- [ ] **Step 4: Supprimer l'ancien fichier avec la faute de frappe**

```bash
rm src/listeners/playerListerners.ts
```

- [ ] **Step 5: Vérifier qu'aucun fichier n'importe encore depuis `playerListerners`**

```bash
grep -r "playerListerners" src/
```

Expected: aucun résultat.

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 7: Commit**

```bash
git add src/listeners/ src/core/player.ts
git commit -m "refactor: rename playerListerners to playerListeners, decouple voiceConnectionErrorListener"
```

---

## Task 11: Passe Biome complète + build final

**Files:**
- Tous les fichiers `src/**/*.ts`

- [ ] **Step 1: Lancer Biome sur tout le projet**

```bash
npx biome check --write .
```

Biome va formater le code (indentation, quotes, trailing commas), organiser les imports, et corriger les problèmes de lint. Corriger manuellement les erreurs résiduelles si `--write` ne peut pas les résoudre seul.

- [ ] **Step 2: Vérifier qu'il n'y a plus d'erreurs Biome**

```bash
npx biome check .
```

Expected: aucune erreur. Les warnings acceptables peuvent être ignorés.

- [ ] **Step 3: Build final complet**

```bash
npm run build
```

Expected: `npm run lint` (Biome) passe, `tsup` compile sans erreurs, `dist/Bot.js` généré dans `dist/`.

- [ ] **Step 4: Vérifier knip**

```bash
npm run knip
```

Examiner les exports marqués comme inutilisés. Supprimer ceux qui sont effectivement dead code (ex: `getAudioStream` si non utilisé).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: apply biome formatting and lint fixes across codebase"
```

---

## Task 12: Vérification manuelle du bot

- [ ] **Step 1: Vérifier le `.env`**

S'assurer que `.env` est présent et contient toutes les variables requises :
```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DATABASE_CONNECTION_STRING=...
DATABASE_USER=...
DATABASE_PASSWORD=...
```

Optionnel : `PREFIX` (défaut `&`), `LANGUAGE` (défaut `en-US`), `DETECT_FROM_ALL_MESSAGES` (défaut `false`).

- [ ] **Step 2: Lancer la stack**

```bash
docker compose up -d
```

Ou si MongoDB tourne déjà localement :

```bash
npm run dev
```

Expected: le bot se connecte à Discord et à MongoDB sans erreur dans les logs.

- [ ] **Step 3: Tests manuels dans Discord**

Rejoindre un vocal, puis tester chaque scénario :

1. `&play https://www.youtube.com/watch?v=dQw4w9WgXcQ` — une chanson se lance
2. `&skip` — passe à la suivante ou le bot quitte si la queue est vide
3. `&pause` puis `&resume` — le bot se met en pause et reprend
4. `&queue` — affiche la file d'attente
5. `/play daft punk` — commande slash avec recherche texte fonctionne
6. `&play daft punk harder better` — recherche texte via text command
7. URL invalide (ex: `&play https://youtube.com/invalid`) — embed d'erreur s'affiche
8. Recherche sans résultat probable — embed d'erreur s'affiche
9. `&fuckoff` — le bot quitte le vocal et vide la queue

- [ ] **Step 4: Commit de corrections post-test si nécessaire**

```bash
git add -A
git commit -m "fix: post-manual-testing corrections"
```

---

## Task 13: Setup Vitest + vitest.config.ts

**Files:**

- Create: `vitest.config.ts`
- Create: `src/tests/` (structure)
- Modify: `package.json` — ajouter script `test`

- [ ] **Step 1: Consulter Context7 pour Vitest**

```
mcp__plugin_context7_context7__resolve-library-id: "vitest-dev/vitest"
mcp__plugin_context7_context7__query-docs: topic "configuration vitest.config.ts typescript coverage"
```

- [ ] **Step 2: Créer `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/Bot.ts'],
    },
  },
  resolve: {
    alias: {
      src: new URL('./src', import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 3: Ajouter le script `test` dans `package.json`**

Dans la section `scripts`, ajouter :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Créer la structure des dossiers de test**

```bash
mkdir -p src/tests/unit src/tests/integration
```

- [ ] **Step 5: Vérifier que Vitest s'exécute (sans tests)**

```bash
npm test
```

Expected: "No test files found" ou 0 tests — pas d'erreur de configuration.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/tests/ package.json
git commit -m "test: setup vitest with coverage"
```

---

## Task 14: Tests unitaires — youtubeUtils + messageUtils + songRequest logic

**Files:**

- Create: `src/tests/unit/youtubeUtils.test.ts`
- Create: `src/tests/unit/messageUtils.test.ts`
- Create: `src/tests/unit/songRequest.test.ts`

- [ ] **Step 1: Créer `src/tests/unit/youtubeUtils.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { yt_validate } from 'src/utils/youtubeUtils';

describe('yt_validate', () => {
  it('returns "video" for a standard YouTube URL', () => {
    expect(yt_validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "video" for a youtu.be short URL', () => {
    expect(yt_validate('https://youtu.be/dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "video" for a YouTube Shorts URL', () => {
    expect(yt_validate('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "playlist" for a playlist URL', () => {
    expect(yt_validate('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-')).toBe('playlist');
  });

  it('returns "search" for plain text', () => {
    expect(yt_validate('daft punk harder better faster stronger')).toBe('search');
  });

  it('returns false for an unrecognized https URL', () => {
    expect(yt_validate('https://example.com/video')).toBe(false);
  });

  it('returns "video" for a raw video ID', () => {
    expect(yt_validate('dQw4w9WgXcQ')).toBe('video');
  });
});
```

- [ ] **Step 2: Créer `src/tests/unit/messageUtils.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&' },
}));

import { messageFormater } from 'src/utils/messageUtils';

describe('messageFormater', () => {
  it('extracts the command from a prefixed message', () => {
    const result = messageFormater('&play some song');
    expect(result.command).toBe('play');
    expect(result.splittedMessage).toEqual(['&play', 'some', 'song']);
  });

  it('handles a message with only the command', () => {
    const result = messageFormater('&skip');
    expect(result.command).toBe('skip');
    expect(result.splittedMessage).toEqual(['&skip']);
  });
});
```

- [ ] **Step 3: Créer `src/tests/unit/songRequest.test.ts`**

Ce test vérifie la logique simplifiée de `songRequest` — les branches `if (!activePlayerGuild)` et `else if (!isComingFromPlaylist)` — en mockant toutes les dépendances externes.

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSongPlayer = vi.fn();
const mockSendEmbed = vi.fn();
const mockPushSongs = vi.fn();
const mockUpdateVoiceChannel = vi.fn();
const mockExtractSongData = vi.fn().mockResolvedValue({ title: 'Test Song', url: 'https://youtube.com/watch?v=test' });
const mockExtractVoiceChannelData = vi.fn().mockResolvedValue({ channelId: '1', guildId: '42' });

vi.mock('src/Bot', () => ({ activePlayers: {} }));
vi.mock('src/core/player', () => ({ songPlayer: mockSongPlayer }));
vi.mock('src/core/messages', () => ({ sendEmbed: mockSendEmbed, sendErrorEmbed: vi.fn() }));
vi.mock('src/database/queries/guilds/update', () => ({
  pushSongs: mockPushSongs,
  updateVoiceChannel: mockUpdateVoiceChannel,
}));
vi.mock('src/utils/songUtils', () => ({
  extractSongData: mockExtractSongData,
  extractVoiceChannelData: mockExtractVoiceChannelData,
}));

import { activePlayers } from 'src/Bot';
import { songRequest } from 'src/core/requestHandlers/songRequest';

describe('songRequest', () => {
  const mockUser = { id: 'u1', username: 'testuser' } as any;
  const mockVoiceChannel = { id: 'vc1', guild: { id: '42' } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (activePlayers as any)['42'];
  });

  it('calls songPlayer when no active player exists', async () => {
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel);
    expect(mockSongPlayer).toHaveBeenCalledWith('42');
    expect(mockSendEmbed).not.toHaveBeenCalled();
  });

  it('calls sendEmbed when player is active and song is not from playlist', async () => {
    (activePlayers as any)['42'] = { audioPlayer: {} };
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel, false);
    expect(mockSendEmbed).toHaveBeenCalledWith('42', false, false);
    expect(mockSongPlayer).not.toHaveBeenCalled();
  });

  it('calls neither songPlayer nor sendEmbed when coming from playlist and player active', async () => {
    (activePlayers as any)['42'] = { audioPlayer: {} };
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel, true);
    expect(mockSongPlayer).not.toHaveBeenCalled();
    expect(mockSendEmbed).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Lancer les tests unitaires**

```bash
npm test
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add src/tests/unit/
git commit -m "test: add unit tests for youtubeUtils, messageUtils, songRequest logic"
```

---

## Task 15: Tests d'intégration — queries MongoDB avec mongodb-memory-server

**Files:**

- Create: `src/tests/integration/guilds.test.ts`

- [ ] **Step 1: Consulter Context7 pour mongodb-memory-server**

```
mcp__plugin_context7_context7__resolve-library-id: "nodkz/mongodb-memory-server"
mcp__plugin_context7_context7__query-docs: topic "setup vitest mongoose connect beforeAll afterAll"
```

- [ ] **Step 2: Créer `src/tests/integration/guilds.test.ts`**

```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { guild_model } from 'src/database/schema/guild';
import { fetchGuild, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { pushSongs, shiftSongs } from 'src/database/queries/guilds/update';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'test' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await guild_model.deleteMany({});
});

const mockSong = (title: string) => ({
  title,
  url: `https://youtube.com/watch?v=${title}`,
  thumbnail: 'https://example.com/thumb.jpg',
  videoAuthor: 'Author',
  videoLength: '3:30',
  minutes: 3,
  seconds: 30,
  requestDateTimestamp: Date.now(),
  requestAuthor: { id: 'u1', username: 'test' },
  requestChannel: 'ch1',
  isQueueStart: true,
  isComingFromPlaylist: false,
});

describe('fetchGuild', () => {
  it('creates a guild document if it does not exist', async () => {
    const guild = await fetchGuild('guild-1');
    expect(guild.guildId).toBe('guild-1');
  });

  it('returns the same guild document on subsequent calls', async () => {
    await fetchGuild('guild-2');
    await fetchGuild('guild-2');
    const count = await guild_model.countDocuments({ guildId: 'guild-2' });
    expect(count).toBe(1);
  });
});

describe('pushSongs + getFirstSong + getNextSongs', () => {
  it('pushes songs and retrieves the first song', async () => {
    await fetchGuild('guild-3');
    await pushSongs('guild-3', [mockSong('song-a'), mockSong('song-b')]);
    const first = await getFirstSong('guild-3');
    expect(first.title).toBe('song-a');
  });

  it('getNextSongs returns songs after the first', async () => {
    await fetchGuild('guild-4');
    await pushSongs('guild-4', [mockSong('song-x'), mockSong('song-y'), mockSong('song-z')]);
    const next = await getNextSongs('guild-4');
    expect(next).toHaveLength(2);
    expect(next[0].title).toBe('song-y');
  });
});

describe('shiftSongs', () => {
  it('moves the first song to previouslyPlayedSongs', async () => {
    await fetchGuild('guild-5');
    await pushSongs('guild-5', [mockSong('alpha'), mockSong('beta')]);
    await shiftSongs('guild-5');
    const guild = await guild_model.findOne({ guildId: 'guild-5' });
    expect(guild!.nextSongs).toHaveLength(1);
    expect((guild!.nextSongs[0] as any).title).toBe('beta');
    expect(guild!.previouslyPlayedSongs).toHaveLength(1);
  });
});

describe('emptyNextSongs', () => {
  it('clears the entire queue', async () => {
    await fetchGuild('guild-6');
    await pushSongs('guild-6', [mockSong('one'), mockSong('two')]);
    await emptyNextSongs('guild-6');
    const first = await getFirstSong('guild-6');
    expect(first).toBeUndefined();
  });
});

describe('removeCurrentPlayingSong', () => {
  it('removes the first song and adds it to history', async () => {
    await fetchGuild('guild-7');
    await pushSongs('guild-7', [mockSong('current'), mockSong('next')]);
    await removeCurrentPlayingSong('guild-7');
    const guild = await guild_model.findOne({ guildId: 'guild-7' });
    expect(guild!.nextSongs).toHaveLength(1);
    expect(guild!.previouslyPlayedSongs).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Lancer les tests d'intégration**

```bash
npm test
```

Expected: tous les tests passent (unitaires + intégration).

- [ ] **Step 4: Vérifier la couverture**

```bash
npm run test:coverage
```

Inspecter le rapport — les fichiers `youtubeUtils.ts`, `messageUtils.ts`, `songRequest.ts`, `get.ts`, `update.ts`, `delete.ts` doivent avoir une couverture significative.

- [ ] **Step 5: Commit**

```bash
git add src/tests/integration/
git commit -m "test: add integration tests for guild DB queries with mongodb-memory-server"
```

---

## Récapitulatif des commits

1. `chore: migrate to biome + lefthook, update all dependencies`
2. `fix: adapt code to @discordjs/voice breaking changes`
3. `fix: adapt code to discord.js breaking changes`
4. `fix: adapt code to mongoose 9 breaking changes`
5. `fix: adapt code to @distube/* and youtube-dl-exec breaking changes`
6. `refactor: simplify duplicate if/else in songRequest`
7. `feat: add error handling to song pipeline (sendErrorEmbed, guards, try/catch)`
8. `refactor: split utils.ts into songUtils, youtubeUtils, messageUtils`
9. `refactor: rename playerListerners to playerListeners, decouple voiceConnectionErrorListener`
10. `style: apply biome formatting and lint fixes across codebase`
11. `test: setup vitest with coverage`
12. `test: add unit tests for youtubeUtils, messageUtils, songRequest logic`
13. `test: add integration tests for guild DB queries with mongodb-memory-server`
14. `fix: post-manual-testing corrections` (si nécessaire)
