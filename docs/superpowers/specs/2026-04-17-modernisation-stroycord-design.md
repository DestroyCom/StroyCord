# StroyCord — Modernisation complète (2026-04-17)

## Contexte

Le bot n'a pas été maintenu depuis ~2 ans. Il est actuellement non fonctionnel (`youtube-dl-exec` et `@distube/ytpl` absents de `node_modules`, `@distube/ytdl-core` en version invalide, dépendances extraneous nombreuses). L'objectif est une remise à niveau complète : dépendances, tooling, et qualité de code.

**Approche retenue :** Tout en une passe — mise à jour packages → adaptation code aux breaking changes → refacto → migration tooling. Ordre justifié par l'état non fonctionnel du projet (rien à préserver).

**Note :** L'optimisation du streaming audio (remplacement de `youtube-dl-exec` par une autre solution) est hors scope — fera l'objet d'un second spec.

---

## 1. Mise à jour des dépendances

### Runtime

| Package | Actuel | Action |
|---|---|---|
| `discord.js` | 14.13 | Mettre à jour vers latest |
| `@discordjs/voice` | 0.18 | Mettre à jour vers latest |
| `@discordjs/opus` | 0.10 | Mettre à jour vers latest |
| `@distube/ytdl-core` | 4.16.8 (invalide) | Mettre à jour vers latest |
| `@distube/ytpl` | non installé | Installer latest |
| `@distube/ytsr` | 2.0.4 | Mettre à jour vers latest |
| `mongoose` | 7.6 | Mettre à jour vers 8.x |
| `mongodb` | 5.8 | Mettre à jour vers 6.x |
| `youtube-dl-exec` | manquant | Réinstaller latest |
| `i18n-js` | 4.3 | Mettre à jour vers latest |
| `axios` | 1.7 | Mettre à jour vers latest |
| `dotenv` | 16.3 | Mettre à jour vers latest |
| `libsodium-wrappers` | 0.7.15 | Mettre à jour vers latest |

### DevDependencies

**Supprimer :**
- `eslint`, `eslint-config-prettier`, `eslint-config-standard-with-typescript`
- `eslint-plugin-import`, `eslint-plugin-n`, `eslint-plugin-prettier`
- `eslint-plugin-promise`, `eslint-plugin-simple-import-sort`
- `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- `prettier`
- `husky`

**Ajouter :**
- `@biomejs/biome` (latest)
- `lefthook` (latest)

**Mettre à jour :**
- `tsx`, `tsup`, `typescript`, `knip`, `@types/node`
- `@commitlint/cli`, `@commitlint/config-conventional`

### Nettoyage node_modules

Les ~20 packages extraneous (jsdom, youtubei.js et leurs transitives) seront éliminés par un `npm install` propre après mise à jour de `package.json`. La section `overrides` pour `discord-api-types` devra être réévaluée — à supprimer si le conflit n'existe plus avec les nouvelles versions.

### Utilisation de Context7

Pour chaque package avec breaking changes majeurs, consulter Context7 avant d'adapter le code :
- `discord.js` (14→15 si applicable)
- `@discordjs/voice`
- `mongoose` (7→8)
- `youtube-dl-exec`
- `@distube/ytdl-core`, `@distube/ytsr`, `@distube/ytpl`

---

## 2. Refactorisation du code

### 2a. Correction de la logique dupliquée (`songRequest.ts`)

**Avant :**
```ts
if (!activePlayerGuild && !isComingFromPlaylist) {
  await songPlayer(guildId);
} else if (!activePlayerGuild && isComingFromPlaylist) {
  await songPlayer(guildId); // identique à la branche précédente
} else if (!isComingFromPlaylist) {
  await sendEmbed(guildId, false, false);
}
```

**Après :**
```ts
if (!activePlayerGuild) {
  await songPlayer(guildId);
} else if (!isComingFromPlaylist) {
  await sendEmbed(guildId, false, false);
}
```

### 2b. Gestion d'erreur manquante

**`searchRequest.ts`** : aucun guard sur `searchedVideo.items[0]`. Si la recherche ne retourne aucun résultat → crash silencieux. Ajouter un guard avec message d'erreur renvoyé au channel.

**`player.ts`** : le `console.log('Stream is undefined')` n'informe pas l'utilisateur. Remplacer par un `sendEmbed` d'erreur vers le channel.

**`utils.ts` — `extractSongData`** : `ytdl.getInfo()` peut throw si l'URL est invalide, la vidéo est privée ou supprimée. Entourer d'un try/catch et propager une erreur métier claire.

### 2c. Séparation des responsabilités (`utils.ts`)

`utils.ts` regroupe actuellement quatre responsabilités distinctes. Découper en :

- **`songUtils.ts`** : `extractSongData`, `extractVoiceChannelData`
- **`youtubeUtils.ts`** : `yt_validate`, `getAudioStream`
- **`messageUtils.ts`** : `messageFormater` (déjà peu utilisé, évaluer si `knip` le marque comme unused)

### 2d. Découplage des listeners (`errorListeners.ts`)

`errorListeners.ts` exporte deux choses sans lien direct : le listener client Discord par défaut ET `voiceConnectionErrorListener`. Déplacer `voiceConnectionErrorListener` dans `playerListeners.ts` (qui gère déjà les événements audio player).

---

## 3. Migration tooling

### 3a. Biome (remplace ESLint + Prettier)

**Fichiers à supprimer :** `.eslintrc.js`, `.eslintignore`, `.prettierrc`

**Nouveau fichier `biome.json` :**
```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "organizeImports": { "enabled": true },
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
  }
}
```

`organizeImports` remplace `eslint-plugin-simple-import-sort` nativement.

### 3b. Lefthook (remplace Husky)

**Fichiers à supprimer :** dossier `.husky/`

**Supprimer de `package.json` :** script `"prepare": "husky install || true"` et section `"husky"`.

**Nouveau fichier `lefthook.yml` :**
```yaml
pre-commit:
  commands:
    lint:
      run: npx biome check --write .

commit-msg:
  commands:
    commitlint:
      run: npx commitlint --edit {1}
```

### 3c. Scripts `package.json` mis à jour

```json
"scripts": {
  "dev": "tsx watch ./src/Bot.ts",
  "start": "node ./dist/Bot.js",
  "build": "npm run lint && tsup ./src/Bot.ts --minify",
  "lint": "biome check --write .",
  "knip": "knip"
}
```

---

## Ordre d'exécution

1. Audit des versions latest de tous les packages (via npm/Context7)
2. Mise à jour `package.json` (runtime + devDeps) + `npm install` propre
3. Adaptation du code aux breaking changes (en consultant Context7)
4. Refacto code (2a → 2b → 2c → 2d)
5. Migration Biome + Lefthook (supprimer anciens fichiers, créer nouveaux)
6. Vérification finale : `npm run lint`, `npm run build`, test manuel du bot

## Hors scope

- Remplacement de `youtube-dl-exec` par une alternative de streaming — prévu dans un second spec.
