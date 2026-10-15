import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'fr-FR', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));

import {
  acceptsTextCommands,
  DEFAULT_STORED_SETTINGS,
  isChannelAllowed,
  isMemberBlocked,
  isSlashCommandEnabled,
  nextCommandMode,
  parseLimit,
  parsePrefix,
  QUEUE_LIMIT_CAP,
  resolveMessageChannel,
  resolveSettings,
} from 'src/config/settings';

describe('resolveSettings', () => {
  it('falls back to the instance defaults', () => {
    expect(resolveSettings()).toEqual({
      prefix: '&',
      language: 'fr-FR',
      detectFromAllMessages: false,
      commandChannelIds: [],
      maxQueueSize: 100,
      maxSongsPerUser: 0,
      statsEnabled: true,
      replyChannelId: null,
      replyMessagesEnabled: true,
      commandMode: 'both',
      blockedRoleIds: [],
    });
  });

  it('applies guild overrides', () => {
    const settings = resolveSettings({
      ...DEFAULT_STORED_SETTINGS,
      prefix: '!',
      language: 'en-US',
      detectFromAllMessages: true,
      maxQueueSize: 20,
      maxSongsPerUser: 5,
    });
    expect(settings).toMatchObject({
      prefix: '!',
      language: 'en-US',
      detectFromAllMessages: true,
      maxQueueSize: 20,
      maxSongsPerUser: 5,
    });
  });

  it('clamps limits to the hard cap', () => {
    const settings = resolveSettings({ ...DEFAULT_STORED_SETTINGS, maxQueueSize: 10_000, maxSongsPerUser: 10_000 });
    expect(settings.maxQueueSize).toBe(QUEUE_LIMIT_CAP);
    expect(settings.maxSongsPerUser).toBe(QUEUE_LIMIT_CAP);
  });
});

describe('parsePrefix', () => {
  it('accepts short prefixes and resets on empty input', () => {
    expect(parsePrefix(' !! ')).toEqual({ ok: true, value: '!!' });
    expect(parsePrefix('')).toEqual({ ok: true, value: null });
  });

  it.each(['abcdef', 'a b', '/x'])('rejects %j', (input) => {
    expect(parsePrefix(input).ok).toBe(false);
  });
});

describe('parseLimit', () => {
  it('parses integers within range', () => {
    expect(parseLimit('50', 1, null)).toEqual({ ok: true, value: 50 });
    expect(parseLimit('0', 0, 0)).toEqual({ ok: true, value: 0 });
    expect(parseLimit('  ', 1, null)).toEqual({ ok: true, value: null });
  });

  it.each(['0', '-1', '1.5', 'abc', String(QUEUE_LIMIT_CAP + 1)])('rejects %j when min is 1', (input) => {
    expect(parseLimit(input, 1, null).ok).toBe(false);
  });
});

describe('isChannelAllowed', () => {
  const settings = (ids: string[]) => ({ ...resolveSettings(), commandChannelIds: ids });

  it('allows every channel when none is configured', () => {
    expect(isChannelAllowed(settings([]), 'any')).toBe(true);
  });

  it('allows configured channels and their threads only', () => {
    expect(isChannelAllowed(settings(['music']), 'music')).toBe(true);
    expect(isChannelAllowed(settings(['music']), 'thread', 'music')).toBe(true);
    expect(isChannelAllowed(settings(['music']), 'general', 'category')).toBe(false);
  });
});

describe('resolveMessageChannel', () => {
  const settings = (overrides: Partial<ReturnType<typeof resolveSettings>> = {}) => ({
    ...resolveSettings(),
    ...overrides,
  });

  it('answers in the command channel when no reply channel is configured', () => {
    expect(resolveMessageChannel(settings(), 'cmd', 'info')).toBe('cmd');
    expect(resolveMessageChannel(settings(), 'cmd', 'announce')).toBe('cmd');
  });

  it('sends info and announcements to the reply channel', () => {
    const withReply = settings({ replyChannelId: 'replies' });
    expect(resolveMessageChannel(withReply, 'cmd', 'info')).toBe('replies');
    expect(resolveMessageChannel(withReply, 'cmd', 'announce')).toBe('replies');
  });

  it('keeps errors in the command channel', () => {
    expect(resolveMessageChannel(settings({ replyChannelId: 'replies' }), 'cmd', 'error')).toBe('cmd');
  });

  it('drops only announcements when replies are disabled', () => {
    const muted = settings({ replyChannelId: 'replies', replyMessagesEnabled: false });
    expect(resolveMessageChannel(muted, 'cmd', 'announce')).toBeNull();
    expect(resolveMessageChannel(muted, 'cmd', 'info')).toBe('replies');
    expect(resolveMessageChannel(muted, 'cmd', 'error')).toBe('cmd');
  });
});

describe('command mode', () => {
  const settings = (commandMode: 'both' | 'text' | 'slash') => ({ ...resolveSettings(), commandMode });

  it('cycles through both, text and slash', () => {
    expect(nextCommandMode('both')).toBe('text');
    expect(nextCommandMode('text')).toBe('slash');
    expect(nextCommandMode('slash')).toBe('both');
  });

  it('ignores prefix commands in slash mode only', () => {
    expect(acceptsTextCommands(settings('both'))).toBe(true);
    expect(acceptsTextCommands(settings('text'))).toBe(true);
    expect(acceptsTextCommands(settings('slash'))).toBe(false);
  });

  it('keeps /config and /stats in text mode', () => {
    expect(isSlashCommandEnabled(settings('text'), 'play')).toBe(false);
    expect(isSlashCommandEnabled(settings('text'), 'config')).toBe(true);
    expect(isSlashCommandEnabled(settings('text'), 'stats')).toBe(true);
    expect(isSlashCommandEnabled(settings('both'), 'play')).toBe(true);
    expect(isSlashCommandEnabled(settings('slash'), 'play')).toBe(true);
  });
});

describe('isMemberBlocked', () => {
  const settings = (blockedRoleIds: string[]) => ({ ...resolveSettings(), blockedRoleIds });

  it('blocks nobody when no role is blocked', () => {
    expect(isMemberBlocked(settings([]), ['dj', 'member'])).toBe(false);
  });

  it('blocks members having at least one blocked role', () => {
    expect(isMemberBlocked(settings(['muted']), ['member', 'muted'])).toBe(true);
    expect(isMemberBlocked(settings(['muted']), ['member'])).toBe(false);
  });
});
