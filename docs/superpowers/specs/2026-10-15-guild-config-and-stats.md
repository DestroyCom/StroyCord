# Configuration par serveur, salons autorisés, limites de file et statistiques

## Objectif

- Rendre le comportement du bot configurable **par serveur Discord**, depuis Discord, via `/config` (admins uniquement, panneau en embed + composants).
- Restreindre les commandes à certains salons (anti-flood).
- Limiter la taille de la file d'attente.
- Collecter des statistiques d'écoute et les exposer via `/stats`.
- La configuration et les stats **persistent entre deux redémarrages** : le reset de démarrage ne touche que l'état d'exécution.

## Décisions

| Sujet | Décision |
|---|---|
| Stockage config | Collection `GuildSettings` séparée de `Guild` (état éphémère). `null` = valeur par défaut de l'instance (`.env`) |
| Cache | `Map<guildId, StoredSettings>` en mémoire, write-through. Un seul process, pas de sharding |
| i18n / préfixe par serveur | `AsyncLocalStorage` : chaque point d'entrée (message, interaction, listeners du player) exécute son traitement dans le contexte des réglages du serveur. `i18n.t()` et `getPrefix()` lisent ce contexte (repli sur les valeurs du `.env` hors contexte). Le code métier (limites, stats) lit les réglages explicitement via `getGuildSettings(guildId)` |
| Permissions `/config` | `setDefaultMemberPermissions(ManageGuild)` + vérification `ManageGuild` à chaque commande, clic et modal |
| Composants | Routage global et sans état par préfixe de `customId` (`cfg:`, `stats:`), pas de collectors → survit aux redémarrages |
| Salons autorisés | Liste vide = tous. Commandes texte hors salon : ignorées en silence. Slash : réponse éphémère. `/config` toujours exemptée. Threads : on regarde le salon parent |
| Limite de file | `maxQueueSize` (défaut `MAX_QUEUE_SIZE`, 100 ; plafond 500), **titre en cours inclus**. `maxSongsPerUser` (0 = illimité), titre en cours inclus aussi. Push conditionnel atomique (`$expr` + `$size`). Les playlists s'arrêtent à la première limite atteinte |
| Stats | Collection `plays` en ajout seul (une écoute = un document). Durée réelle = `AudioResource.playbackDuration` (pauses exclues). Enregistrement quand la ressource du player change (fin naturelle **et** skip) + dans `remove()` avant `stop()`. Écoutes < 5 s ignorées |
| Départ d'un serveur | `GuildDelete` (kick réel ; les pannes émettent `GuildUnavailable`) : état runtime supprimé, config + stats marquées `deletedAt` puis purgées après 30 jours. Retour du bot = restauration |
| Persistance | `fetchGuild` passe en upsert atomique, index unique sur `guildId` (dédoublonnage au démarrage), historique plafonné à 50 titres |

## Réglages

| Clé | Type | Défaut |
|---|---|---|
| `prefix` | 1–5 caractères sans espace, ne commence pas par `/` | `PREFIX` |
| `language` | `en-US` \| `fr-FR` | `LANGUAGE` |
| `detectFromAllMessages` | booléen | `DETECT_FROM_ALL_MESSAGES` |
| `commandChannelIds` | salons texte/vocaux (max 25) | `[]` (tous) |
| `maxQueueSize` | 1–500 | `MAX_QUEUE_SIZE` (100) |
| `maxSongsPerUser` | 0–500 (0 = illimité) | 0 |
| `statsEnabled` | booléen | `true` |

## `/stats`

- `/stats server [period]` : temps total, écoutes, titres différents, taux de skip, titre le plus joué, top DJ, heure la plus active.
- `/stats top type:(tracks|artists|djs) [period]` : classement paginé (boutons ◀ ▶, 10 par page).
- `/stats user [member] [period]` : stats perso.
- `period` : `7d` | `30d` | `all` (défaut `all`).

## Hors périmètre (suite possible)

Rôle DJ, salon d'annonce dédié, récap mensuel automatique, auto-leave, volume par serveur (casserait le passthrough Opus).
