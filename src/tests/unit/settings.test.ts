import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'fr-FR', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));

import {
  DEFAULT_STORED_SETTINGS,
  isChannelAllowed,
  parseLimit,
  parsePrefix,
  QUEUE_LIMIT_CAP,
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
