import { secrets } from './secrets';

export const SUPPORTED_LANGUAGES = ['en-US', 'fr-FR'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const COMMAND_MODES = ['both', 'text', 'slash'] as const;
export type CommandMode = (typeof COMMAND_MODES)[number];

// Upper bound for both queue limits, whatever the guild asks for: the queue lives in a single document
export const QUEUE_LIMIT_CAP = 500;
// Discord allows at most 25 values in a select menu
export const MAX_COMMAND_CHANNELS = 25;
export const MAX_BLOCKED_ROLES = 25;

/** Settings as stored for a guild: null means "use the instance default" (.env) */
export interface StoredSettings {
  prefix: string | null;
  language: Language | null;
  detectFromAllMessages: boolean | null;
  commandChannelIds: string[];
  maxQueueSize: number | null;
  /** 0 = unlimited */
  maxSongsPerUser: number;
  statsEnabled: boolean;
  /** null = answer in the channel of the command */
  replyChannelId: string | null;
  replyMessagesEnabled: boolean;
  commandMode: CommandMode;
  blockedRoleIds: string[];
}

/** Settings with the instance defaults applied */
export interface GuildSettings {
  prefix: string;
  language: Language;
  detectFromAllMessages: boolean;
  /** Empty = commands are accepted in every channel */
  commandChannelIds: string[];
  /** Includes the song currently playing */
  maxQueueSize: number;
  /** Includes the song currently playing, 0 = unlimited */
  maxSongsPerUser: number;
  statsEnabled: boolean;
  /** null = answer in the channel of the command */
  replyChannelId: string | null;
  /** false = announcements (now playing, added, skip, pause…) are not sent */
  replyMessagesEnabled: boolean;
  /** Which commands the guild accepts: prefix ('text'), slash, or both */
  commandMode: CommandMode;
  /** Members with any of these roles are ignored by the bot */
  blockedRoleIds: string[];
}

export const DEFAULT_STORED_SETTINGS: StoredSettings = {
  prefix: null,
  language: null,
  detectFromAllMessages: null,
  commandChannelIds: [],
  maxQueueSize: null,
  maxSongsPerUser: 0,
  statsEnabled: true,
  replyChannelId: null,
  replyMessagesEnabled: true,
  commandMode: 'both',
  blockedRoleIds: [],
};

export const isCommandMode = (value: unknown): value is CommandMode => COMMAND_MODES.includes(value as CommandMode);

export const isSupportedLanguage = (value: unknown): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language);

const clampLimit = (value: number) => Math.min(Math.max(Math.trunc(value), 1), QUEUE_LIMIT_CAP);

export const resolveSettings = (stored: StoredSettings = DEFAULT_STORED_SETTINGS): GuildSettings => ({
  prefix: stored.prefix ?? secrets.PREFIX,
  language: stored.language ?? (isSupportedLanguage(secrets.LANGUAGE) ? secrets.LANGUAGE : 'en-US'),
  detectFromAllMessages: stored.detectFromAllMessages ?? secrets.DETECT_FROM_ALL_MESSAGES,
  commandChannelIds: stored.commandChannelIds,
  maxQueueSize: clampLimit(stored.maxQueueSize ?? secrets.MAX_QUEUE_SIZE),
  maxSongsPerUser: stored.maxSongsPerUser > 0 ? clampLimit(stored.maxSongsPerUser) : 0,
  statsEnabled: stored.statsEnabled,
  replyChannelId: stored.replyChannelId,
  replyMessagesEnabled: stored.replyMessagesEnabled,
  commandMode: stored.commandMode,
  blockedRoleIds: stored.blockedRoleIds,
});

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Empty input resets the prefix to the instance default. Errors are i18n keys */
export const parsePrefix = (raw: string): ParseResult<string | null> => {
  const value = raw.trim();
  if (value === '') return { ok: true, value: null };
  if (!/^\S{1,5}$/.test(value) || value.startsWith('/')) return { ok: false, error: 'config.errors.prefix' };
  return { ok: true, value };
};

/** Empty input resets the limit to `emptyValue`. Errors are i18n keys */
export const parseLimit = <E extends number | null>(
  raw: string,
  min: number,
  emptyValue: E
): ParseResult<number | E> => {
  const value = raw.trim();
  if (value === '') return { ok: true, value: emptyValue };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > QUEUE_LIMIT_CAP)
    return { ok: false, error: 'config.errors.limit' };
  return { ok: true, value: parsed };
};

/** Commands are allowed when no channel is configured, or in a configured channel (or a thread of one) */
export const isChannelAllowed = (settings: GuildSettings, channelId: string, parentId?: string | null) =>
  settings.commandChannelIds.length === 0 ||
  settings.commandChannelIds.includes(channelId) ||
  (!!parentId && settings.commandChannelIds.includes(parentId));

/**
 * - info: what the member asked to see (queue, current song)
 * - announce: playback news and action confirmations, muted when replies are disabled
 * - error: always in the command channel, where the member is looking
 */
export type MessageKind = 'info' | 'announce' | 'error';

/** Channel a bot message goes to, or null when it must not be sent */
export const resolveMessageChannel = (
  settings: GuildSettings,
  commandChannelId: string,
  kind: MessageKind
): string | null => {
  if (kind === 'error') return commandChannelId;
  if (kind === 'announce' && !settings.replyMessagesEnabled) return null;
  return settings.replyChannelId ?? commandChannelId;
};

export const nextCommandMode = (mode: CommandMode): CommandMode =>
  COMMAND_MODES[(COMMAND_MODES.indexOf(mode) + 1) % COMMAND_MODES.length];

export const acceptsTextCommands = (settings: GuildSettings) => settings.commandMode !== 'slash';

// Kept in text mode: /config is the only way back to slash commands, /stats has no prefix equivalent
const ALWAYS_ENABLED_SLASH_COMMANDS = new Set(['config', 'stats']);

export const isSlashCommandEnabled = (settings: GuildSettings, commandName: string) =>
  settings.commandMode !== 'text' || ALWAYS_ENABLED_SLASH_COMMANDS.has(commandName);

export const isMemberBlocked = (settings: GuildSettings, memberRoleIds: Iterable<string>) => {
  if (settings.blockedRoleIds.length === 0) return false;
  for (const roleId of memberRoleIds) if (settings.blockedRoleIds.includes(roleId)) return true;
  return false;
};
