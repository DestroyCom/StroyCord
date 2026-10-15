import { runWithSettings } from 'src/config/guildContext';
import {
  DEFAULT_STORED_SETTINGS,
  type GuildSettings,
  isCommandMode,
  isSupportedLanguage,
  resolveSettings,
  type StoredSettings,
} from 'src/config/settings';
import { findGuildSettings, saveGuildSettings } from 'src/database/queries/settings';

// Single process, no sharding: an in-memory write-through cache is always in sync with MongoDB.
// Every message reads the settings (prefix check), so this avoids a DB round-trip per message.
const cache = new Map<string, StoredSettings>();

type SettingsDocument = Partial<Record<keyof StoredSettings, unknown>> | null | undefined;

const toStoredSettings = (doc: SettingsDocument): StoredSettings => ({
  prefix: typeof doc?.prefix === 'string' ? doc.prefix : null,
  language: isSupportedLanguage(doc?.language) ? doc.language : null,
  detectFromAllMessages: typeof doc?.detectFromAllMessages === 'boolean' ? doc.detectFromAllMessages : null,
  commandChannelIds: Array.isArray(doc?.commandChannelIds) ? doc.commandChannelIds.map(String) : [],
  maxQueueSize: typeof doc?.maxQueueSize === 'number' ? doc.maxQueueSize : null,
  maxSongsPerUser: typeof doc?.maxSongsPerUser === 'number' ? doc.maxSongsPerUser : 0,
  statsEnabled: typeof doc?.statsEnabled === 'boolean' ? doc.statsEnabled : true,
  replyChannelId: typeof doc?.replyChannelId === 'string' ? doc.replyChannelId : null,
  replyMessagesEnabled: typeof doc?.replyMessagesEnabled === 'boolean' ? doc.replyMessagesEnabled : true,
  commandMode: isCommandMode(doc?.commandMode) ? doc.commandMode : 'both',
  blockedRoleIds: Array.isArray(doc?.blockedRoleIds) ? doc.blockedRoleIds.map(String) : [],
});

export const getStoredSettings = async (guildId: string): Promise<StoredSettings> => {
  const cached = cache.get(guildId);
  if (cached) return cached;
  const stored = toStoredSettings(await findGuildSettings(guildId));
  cache.set(guildId, stored);
  return stored;
};

export const getGuildSettings = async (guildId: string): Promise<GuildSettings> =>
  resolveSettings(await getStoredSettings(guildId));

export const updateGuildSettings = async (guildId: string, patch: Partial<StoredSettings>, updatedBy: string) => {
  const stored = toStoredSettings(await saveGuildSettings(guildId, patch, updatedBy));
  cache.set(guildId, stored);
  return stored;
};

export const resetGuildSettings = (guildId: string, updatedBy: string) =>
  updateGuildSettings(guildId, DEFAULT_STORED_SETTINGS, updatedBy);

export const forgetGuildSettings = (guildId: string) => {
  cache.delete(guildId);
};

/** Runs `fn` with the guild's language and prefix applied to i18n and embeds */
export const withGuildSettings = async <T>(guildId: string, fn: () => T | Promise<T>): Promise<T> =>
  runWithSettings(await getGuildSettings(guildId), fn);
