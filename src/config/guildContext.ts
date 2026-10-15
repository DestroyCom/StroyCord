import { AsyncLocalStorage } from 'node:async_hooks';

import { type GuildSettings, resolveSettings } from './settings';

// Settings of the guild being handled, carried through every await of a message,
// an interaction or a player event, so i18n and embeds don't need a guildId parameter.
const storage = new AsyncLocalStorage<GuildSettings>();

export const runWithSettings = <T>(settings: GuildSettings, fn: () => T): T => storage.run(settings, fn);

/** Outside of a guild context (startup, background jobs) the instance defaults apply */
export const getContextSettings = (): GuildSettings => storage.getStore() ?? resolveSettings();

export const getPrefix = () => getContextSettings().prefix;
