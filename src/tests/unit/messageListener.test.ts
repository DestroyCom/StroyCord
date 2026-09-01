import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetchGuild,
  mockPlayCommand,
  mockSkipCommand,
  mockRemoveCommand,
  mockPauseCommand,
  mockResumeCommand,
  mockQueueCommand,
  mockCurrentCommand,
  mockRedoCommand,
  mockUnknownRequestEmbed,
  mockMessageFormater,
  mockYtValidate,
  mockChannelSend,
} = vi.hoisted(() => ({
  mockFetchGuild: vi.fn().mockResolvedValue({ guildId: 'g1' }),
  mockPlayCommand: vi.fn(),
  mockSkipCommand: vi.fn(),
  mockRemoveCommand: vi.fn(),
  mockPauseCommand: vi.fn(),
  mockResumeCommand: vi.fn(),
  mockQueueCommand: vi.fn(),
  mockCurrentCommand: vi.fn(),
  mockRedoCommand: vi.fn(),
  mockUnknownRequestEmbed: vi.fn().mockReturnValue({ type: 'embed' }),
  mockMessageFormater: vi.fn().mockReturnValue({ command: 'play', splittedMessage: ['&play', 'song'] }),
  mockYtValidate: vi.fn().mockReturnValue(false),
  mockChannelSend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', DETECT_FROM_ALL_MESSAGES: false },
}));
vi.mock('src/database/queries/guilds/get', () => ({ fetchGuild: mockFetchGuild }));
vi.mock('src/commands/slashCommands', () => ({ commands: {} }));
vi.mock('src/commands/textCommands', () => ({
  playCommand: mockPlayCommand,
  skipCommand: mockSkipCommand,
  removeCommand: mockRemoveCommand,
  pauseCommand: mockPauseCommand,
  resumeCommand: mockResumeCommand,
  queueCommand: mockQueueCommand,
  currentCommand: mockCurrentCommand,
  redoCommand: mockRedoCommand,
}));
vi.mock('src/utils/embeds/errorsEmbed', () => ({ unknownRequestEmbed: mockUnknownRequestEmbed }));
vi.mock('src/utils/messageUtils', () => ({ messageFormater: mockMessageFormater }));
vi.mock('src/utils/youtubeUtils', () => ({ yt_validate: mockYtValidate }));

import { type Client, Events } from 'discord.js';
import registerMessageListener from 'src/listeners/messageListener';

/** Helper: build a minimal mock Client that captures registered event listeners. */
function buildMockClient() {
  const listeners: Record<string, ((...args: unknown[]) => unknown)[]> = {};
  const client = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      listeners[event] ??= [];
      listeners[event].push(handler);
    }),
    emit: (event: string, ...args: unknown[]) => {
      for (const handler of listeners[event] ?? []) {
        handler(...args);
      }
    },
  } as unknown as Client;
  return { client, listeners };
}

/** Helper: build a minimal mock Discord Message. */
function buildMockMessage(overrides: Partial<{
  content: string;
  isBot: boolean;
  startsWithPrefix: boolean;
}> = {}) {
  const content = overrides.content ?? '&play song';
  const deleteMock = vi.fn().mockResolvedValue(undefined);
  return {
    content,
    author: { bot: overrides.isBot ?? false },
    guildId: 'g1',
    member: { voice: { channel: { id: 'vc1' } } },
    channel: { send: mockChannelSend },
    delete: deleteMock,
    _deleteMock: deleteMock,
  };
}

describe('messageListener – MessageCreate handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetchGuild.mockResolvedValue({ guildId: 'g1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers a MessageCreate listener on the client', () => {
    const { client } = buildMockClient();
    registerMessageListener(client);
    expect((client.on as ReturnType<typeof vi.fn>).mock.calls.some(([e]) => e === Events.MessageCreate)).toBe(true);
  });

  it('ignores messages from bots', async () => {
    const { client, listeners } = buildMockClient();
    registerMessageListener(client);
    const message = buildMockMessage({ isBot: true });
    await listeners[Events.MessageCreate]?.[0]?.(message);
    expect(mockFetchGuild).not.toHaveBeenCalled();
    expect(message._deleteMock).not.toHaveBeenCalled();
  });

  it('ignores messages that do not start with prefix when DETECT_FROM_ALL_MESSAGES is false', async () => {
    const secrets = await import('src/config/secrets');
    (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean }).DETECT_FROM_ALL_MESSAGES = false;

    const { client, listeners } = buildMockClient();
    registerMessageListener(client);
    const message = buildMockMessage({ content: 'hello world' });
    mockMessageFormater.mockReturnValueOnce({ command: 'play', splittedMessage: ['play'] });
    await listeners[Events.MessageCreate]?.[0]?.(message);
    expect(mockFetchGuild).not.toHaveBeenCalled();
  });

  it('processes messages that start with prefix even when DETECT_FROM_ALL_MESSAGES is false', async () => {
    const secrets = await import('src/config/secrets');
    (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean }).DETECT_FROM_ALL_MESSAGES = false;

    const { client, listeners } = buildMockClient();
    registerMessageListener(client);
    mockMessageFormater.mockReturnValueOnce({ command: 'play', splittedMessage: ['&play', 'song'] });
    const message = buildMockMessage({ content: '&play song' });
    await listeners[Events.MessageCreate]?.[0]?.(message);
    expect(mockFetchGuild).toHaveBeenCalledWith('g1');
    expect(mockPlayCommand).toHaveBeenCalled();
  });

  it('processes any message when DETECT_FROM_ALL_MESSAGES is true', async () => {
    const secrets = await import('src/config/secrets');
    (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean }).DETECT_FROM_ALL_MESSAGES = true;

    const { client, listeners } = buildMockClient();
    registerMessageListener(client);
    mockMessageFormater.mockReturnValueOnce({ command: 'skip', splittedMessage: ['skip'] });
    const message = buildMockMessage({ content: 'skip' });
    await listeners[Events.MessageCreate]?.[0]?.(message);
    expect(mockFetchGuild).toHaveBeenCalledWith('g1');
    expect(mockSkipCommand).toHaveBeenCalled();
  });

  describe('message.delete() is called only for recognized commands', () => {
    beforeEach(() => {
      const secrets = require('src/config/secrets');
      secrets.secrets.DETECT_FROM_ALL_MESSAGES = false;
    });

    it('schedules message.delete() after 1 second for a recognized command', async () => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: 'play', splittedMessage: ['&play', 'song'] });
      const message = buildMockMessage({ content: '&play song' });

      await listeners[Events.MessageCreate]?.[0]?.(message);
      expect(message._deleteMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(message._deleteMock).toHaveBeenCalledTimes(1);
    });

    it('does NOT schedule message.delete() for an unrecognized command', async () => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: 'unknown_xyz', splittedMessage: ['&unknown_xyz'] });
      const message = buildMockMessage({ content: '&unknown_xyz' });

      await listeners[Events.MessageCreate]?.[0]?.(message);
      vi.advanceTimersByTime(2000);
      expect(message._deleteMock).not.toHaveBeenCalled();
    });

    it('silences errors thrown by message.delete() (permission guard)', async () => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: 'play', splittedMessage: ['&play', 'song'] });
      const message = buildMockMessage({ content: '&play song' });
      message._deleteMock.mockRejectedValueOnce(new Error('Missing Permissions'));

      await listeners[Events.MessageCreate]?.[0]?.(message);
      vi.advanceTimersByTime(1000);

      // The rejection must not propagate – Vitest should not see an unhandled rejection.
      await vi.runAllTimersAsync();
      // If we reach here without throwing, the .catch() silenced the error correctly.
      expect(message._deleteMock).toHaveBeenCalledTimes(1);
    });

    it('silences errors thrown by message.delete() even when delete rejects immediately', async () => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: 'skip', splittedMessage: ['&skip'] });
      const message = buildMockMessage({ content: '&skip' });
      message._deleteMock.mockRejectedValue(new Error('DiscordAPIError: Missing Permissions'));

      await listeners[Events.MessageCreate]?.[0]?.(message);
      // Should not throw after timer fires
      await expect(vi.runAllTimersAsync()).resolves.not.toThrow();
    });

    it('sends unknown embed and does NOT delete for default/unrecognized command', async () => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: 'nonexistent', splittedMessage: ['&nonexistent'] });
      const message = buildMockMessage({ content: '&nonexistent' });

      await listeners[Events.MessageCreate]?.[0]?.(message);
      vi.advanceTimersByTime(2000);

      expect(mockChannelSend).toHaveBeenCalledWith({ embeds: [{ type: 'embed' }] });
      expect(message._deleteMock).not.toHaveBeenCalled();
    });
  });

  describe('command routing', () => {
    beforeEach(async () => {
      const secrets = await import('src/config/secrets');
      (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean }).DETECT_FROM_ALL_MESSAGES = false;
      vi.clearAllMocks();
      mockFetchGuild.mockResolvedValue({ guildId: 'g1' });
    });

    it.each([
      ['play', mockPlayCommand],
      ['p', mockPlayCommand],
    ])('routes command "%s" to playCommand', async (cmd, mockFn) => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: cmd, splittedMessage: [`&${cmd}`, 'song'] });
      mockYtValidate.mockReturnValueOnce(false);
      const message = buildMockMessage({ content: `&${cmd} song` });
      await listeners[Events.MessageCreate]?.[0]?.(message);
      expect(mockFn).toHaveBeenCalled();
    });

    it.each([
      ['skip', mockSkipCommand],
      ['s', mockSkipCommand],
    ])('routes command "%s" to skipCommand', async (cmd, mockFn) => {
      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      mockMessageFormater.mockReturnValueOnce({ command: cmd, splittedMessage: [`&${cmd}`] });
      mockYtValidate.mockReturnValueOnce(false);
      const message = buildMockMessage({ content: `&${cmd}` });
      await listeners[Events.MessageCreate]?.[0]?.(message);
      expect(mockFn).toHaveBeenCalled();
    });

    it('routes a YouTube URL to playCommand when yt_validate returns true', async () => {
      const secrets = await import('src/config/secrets');
      (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean; PREFIX: string }).DETECT_FROM_ALL_MESSAGES = true;
      (secrets.secrets as { DETECT_FROM_ALL_MESSAGES: boolean; PREFIX: string }).PREFIX = '&';

      const { client, listeners } = buildMockClient();
      registerMessageListener(client);
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      mockMessageFormater.mockReturnValueOnce({ command: 'other', splittedMessage: [ytUrl] });
      mockYtValidate.mockReturnValueOnce(true);
      const message = buildMockMessage({ content: ytUrl });
      await listeners[Events.MessageCreate]?.[0]?.(message);
      expect(mockPlayCommand).toHaveBeenCalled();
    });
  });
});