import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: {
    PREFIX: '&',
    LANGUAGE: 'en-US',
    DETECT_FROM_ALL_MESSAGES: false,
    MAX_QUEUE_SIZE: 100,
    STROYCORD_LOGO: 'https://example.com/logo.png',
    TIMEZONE: 'UTC',
  },
}));
vi.mock('src/core/settings', () => ({ getGuildSettings: vi.fn() }));
vi.mock('src/database/queries/plays', () => ({ getStatsSummary: vi.fn(), getTop: vi.fn() }));

import { data } from 'src/commands/slashCommands/stats';
import { runWithSettings } from 'src/config/guildContext';
import { resolveSettings } from 'src/config/settings';
import { formatDuration, parseTopCustomId, serverStatsEmbed, topCustomId, topView } from 'src/utils/embeds/statsEmbed';

const entry = (i: number) => ({
  key: `v${i}`,
  label: `Song ${i}`,
  detail: 'Artist',
  plays: 10 - i,
  listenedMs: 60_000,
});

describe('formatDuration', () => {
  it('formats days, hours and minutes', () => {
    expect(formatDuration(30_000)).toBe('< 1 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 5 min');
    expect(formatDuration((2 * 1440 + 3 * 60) * 60_000)).toBe('2 d 3 h');
  });

  it('follows the guild language', () => {
    runWithSettings({ ...resolveSettings(), language: 'fr-FR' }, () => {
      expect(formatDuration(1440 * 60_000)).toBe('1 j');
    });
  });
});

describe('top pagination', () => {
  it('round-trips customIds and rejects tampered ones', () => {
    expect(parseTopCustomId(topCustomId('djs', '30d', 2))).toEqual({ kind: 'djs', period: '30d', page: 2 });
    for (const id of [
      'stats:top:users:all:0',
      'stats:top:tracks:1y:0',
      'stats:top:tracks:all:-1',
      'cfg:top:tracks:all:0',
    ]) {
      expect(parseTopCustomId(id)).toBeNull();
    }
  });

  it('shows navigation only when there are several pages', () => {
    const single = topView('tracks', 'all', 0, { entries: [entry(1)], total: 1 });
    expect(single.components).toHaveLength(0);

    const view = topView('tracks', 'all', 0, { entries: Array.from({ length: 10 }, (_, i) => entry(i)), total: 25 });
    const [prev, next] = view.components[0].toJSON().components as { disabled?: boolean; custom_id: string }[];
    expect(prev.disabled).toBe(true);
    expect(next).toMatchObject({ disabled: false, custom_id: 'stats:top:tracks:all:1' });
    expect(() => view.embeds[0].toJSON()).not.toThrow();
  });
});

describe('stats embeds', () => {
  it('escapes YouTube titles so they cannot break or forge masked links', () => {
    const view = topView('tracks', 'all', 0, {
      entries: [
        { key: 'v1', label: 'Hit](https://evil.example) **bold**', detail: 'A_B', plays: 1, listenedMs: 60_000 },
      ],
      total: 1,
    });
    const description = view.embeds[0].toJSON().description ?? '';
    expect(description).toContain('[Hit\\]\\(https://evil.example\\) \\*\\*bold\\*\\*](https://youtu.be/v1)');
    expect(description).toContain('A\\_B');
  });

  it('builds a valid server embed', () => {
    const embed = serverStatsEmbed(
      'My server',
      {
        plays: 4,
        listenedMs: 600_000,
        skipped: 1,
        uniqueTracks: 3,
        topTrack: entry(1),
        topArtist: { key: 'Artist', label: 'Artist', plays: 3, listenedMs: 1 },
        topDj: { key: '123', label: 'Alice', plays: 2, listenedMs: 1 },
        peakHour: 21,
      },
      '7d'
    ).toJSON();
    expect(embed.fields?.map((f) => f.value)).toContain('25 %');
  });

  it('declares a valid command', () => {
    expect(() => data.toJSON()).not.toThrow();
  });
});
