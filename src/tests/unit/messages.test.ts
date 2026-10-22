import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetGuildSettings, mockCaptureMessage, channels } = vi.hoisted(() => ({
  mockGetGuildSettings: vi.fn(),
  mockCaptureMessage: vi.fn(),
  channels: new Map<string, { send: ReturnType<typeof vi.fn> }>(),
}));

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'en-US', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));
vi.mock('src/Bot', () => ({
  client: {
    guilds: {
      fetch: vi.fn(async () => ({
        channels: {
          cache: { get: (id: string) => channels.get(id) },
          fetch: vi.fn(async () => null),
        },
      })),
    },
  },
}));
vi.mock('src/core/settings', () => ({ getGuildSettings: mockGetGuildSettings }));
vi.mock('src/config/monitoring', () => ({ captureMessage: mockCaptureMessage, captureError: vi.fn() }));
vi.mock('src/database/queries/guilds/get', () => ({ getFirstSong: vi.fn(), getNextSongs: vi.fn() }));
vi.mock('src/utils/embeds/errorsEmbed', () => ({ unknownError: vi.fn() }));
vi.mock('src/utils/embeds/listSongEmbed', () => ({ playlistEmbed: vi.fn() }));
vi.mock('src/utils/embeds/songEmbed', () => ({ addSongEmbed: vi.fn(), newSongEmbed: vi.fn() }));

import type { EmbedBuilder } from 'discord.js';
import type { GuildSettings } from 'src/config/settings';
import { sendBotMessage } from 'src/core/messages';

const embed = { title: 'embed' } as unknown as EmbedBuilder;

const settings = (overrides: Partial<GuildSettings> = {}): GuildSettings => ({
  prefix: '&',
  language: 'en-US',
  detectFromAllMessages: false,
  commandChannelIds: [],
  maxQueueSize: 100,
  maxSongsPerUser: 0,
  statsEnabled: true,
  replyChannelId: null,
  replyMessagesEnabled: true,
  commandMode: 'both',
  blockedRoleIds: [],
  ...overrides,
});

const addChannel = (id: string, send = vi.fn(async () => ({ id: `msg-${id}` }))) => {
  channels.set(id, { send });
  return send;
};

describe('sendBotMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channels.clear();
  });

  it('sends to the reply channel when one is configured', async () => {
    mockGetGuildSettings.mockResolvedValue(settings({ replyChannelId: 'replies' }));
    const cmd = addChannel('cmd');
    const replies = addChannel('replies');

    await sendBotMessage('g1', 'cmd', embed, 'announce');

    expect(replies).toHaveBeenCalledWith({ embeds: [embed] });
    expect(cmd).not.toHaveBeenCalled();
  });

  it('sends nothing for announcements when replies are disabled', async () => {
    mockGetGuildSettings.mockResolvedValue(settings({ replyMessagesEnabled: false }));
    const cmd = addChannel('cmd');

    expect(await sendBotMessage('g1', 'cmd', embed, 'announce')).toBeUndefined();
    expect(cmd).not.toHaveBeenCalled();
  });

  it('falls back to the command channel when the reply channel is gone', async () => {
    mockGetGuildSettings.mockResolvedValue(settings({ replyChannelId: 'deleted' }));
    const cmd = addChannel('cmd');

    await sendBotMessage('g1', 'cmd', embed, 'info');

    expect(cmd).toHaveBeenCalledWith({ embeds: [embed] });
    expect(mockCaptureMessage).toHaveBeenCalled();
  });

  it('falls back to the command channel when the bot cannot write in the reply channel', async () => {
    mockGetGuildSettings.mockResolvedValue(settings({ replyChannelId: 'readonly' }));
    addChannel(
      'readonly',
      vi.fn(async () => {
        throw new Error('Missing Permissions');
      })
    );
    const cmd = addChannel('cmd');

    await sendBotMessage('g1', 'cmd', embed, 'announce');

    expect(cmd).toHaveBeenCalledWith({ embeds: [embed] });
  });
});
