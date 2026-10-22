import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendBotMessage, mockGetNextSongs, mockGetQueuedPlaylists, mockRemovePlaylistSongs, mockPrioritizeSong } =
  vi.hoisted(() => ({
    mockSendBotMessage: vi.fn(),
    mockGetNextSongs: vi.fn(),
    mockGetQueuedPlaylists: vi.fn(),
    mockRemovePlaylistSongs: vi.fn(),
    mockPrioritizeSong: vi.fn(),
  }));

vi.mock('src/Bot', () => ({ activePlayers: { g: { audioPlayer: {} } } }));
vi.mock('src/config/guildContext', () => ({ getPrefix: () => '&' }));
vi.mock('src/config/i18n', () => ({ default: { t: (key: string) => key } }));
vi.mock('src/core/errors', () => ({ authorNotInVoiceChannel: vi.fn(), noMusicCurrentlyPlaying: vi.fn() }));
vi.mock('src/core/messages', () => ({ sendBotMessage: mockSendBotMessage }));
vi.mock('src/core/player', () => ({}));
vi.mock('src/core/requestHandlers/playlistRequest', () => ({}));
vi.mock('src/core/requestHandlers/searchRequest', () => ({}));
vi.mock('src/core/requestHandlers/songRequest', () => ({}));
vi.mock('src/database/queries/guilds/get', () => ({
  getNextSongs: mockGetNextSongs,
  getQueuedPlaylists: mockGetQueuedPlaylists,
}));
vi.mock('src/database/queries/guilds/update', () => ({
  removePlaylistSongs: mockRemovePlaylistSongs,
  prioritizeSong: mockPrioritizeSong,
}));
vi.mock('src/utils/embeds/errorsEmbed', () => ({ unknownError: (message: string) => ({ error: message }) }));
vi.mock('src/utils/embeds/listSongEmbed', () => ({}));
vi.mock('src/utils/embeds/songEmbed', () => ({}));
vi.mock('src/utils/embeds/playerEmbeds', () => ({
  choosePlaylistEmbed: (playlists: unknown[]) => ({ choose: playlists.length }),
  playlistClearedEmbed: (_author: unknown, playlist: { id: string }, removed: number) => ({
    cleared: playlist.id,
    removed,
  }),
  prioritizedEmbed: (_author: unknown, song: { title: string }) => ({ prioritized: song.title }),
}));

import { clearPlaylistCommand, priorityCommand } from 'src/commands/textCommands';

const textChannel = { id: 'ch' } as unknown as import('discord.js').TextBasedChannel;
const voiceChannel = { id: 'vc' } as unknown as import('discord.js').VoiceBasedChannel;
const author = { username: 'tester' } as unknown as import('discord.js').User;
const playlist = (id: string) => ({ id, title: `Playlist ${id}`, count: 3, requestedBy: 'someone' });
const sent = () => mockSendBotMessage.mock.calls.map((call) => [call[2], call[3]]);

describe('clearPlaylistCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemovePlaylistSongs.mockResolvedValue(3);
  });

  it('clears the only waiting playlist without argument', async () => {
    mockGetQueuedPlaylists.mockResolvedValue([playlist('A')]);
    await clearPlaylistCommand('g', textChannel, author, voiceChannel);
    expect(mockRemovePlaylistSongs).toHaveBeenCalledWith('g', 'A');
    expect(sent()).toEqual([[{ cleared: 'A', removed: 3 }, 'announce']]);
  });

  it('asks which one when several playlists are waiting', async () => {
    mockGetQueuedPlaylists.mockResolvedValue([playlist('A'), playlist('B')]);
    await clearPlaylistCommand('g', textChannel, author, voiceChannel);
    expect(mockRemovePlaylistSongs).not.toHaveBeenCalled();
    expect(sent()).toEqual([[{ choose: 2 }, 'info']]);
  });

  it('selects a playlist by number (text) or by id (slash autocomplete)', async () => {
    mockGetQueuedPlaylists.mockResolvedValue([playlist('A'), playlist('B')]);
    await clearPlaylistCommand('g', textChannel, author, voiceChannel, '2');
    await clearPlaylistCommand('g', textChannel, author, voiceChannel, 'A');
    expect(mockRemovePlaylistSongs.mock.calls).toEqual([
      ['g', 'B'],
      ['g', 'A'],
    ]);
  });

  it('reports when no playlist is waiting', async () => {
    mockGetQueuedPlaylists.mockResolvedValue([]);
    await clearPlaylistCommand('g', textChannel, author, voiceChannel);
    expect(sent()).toEqual([[{ error: 'queueTools.noPlaylist' }, 'error']]);
  });
});

describe('priorityCommand', () => {
  const q1 = '11111111-1111-4111-8111-111111111111';
  const q2 = '22222222-2222-4222-8222-222222222222';
  const waiting = [
    { title: 's1', queueId: q1 },
    { title: 's2', queueId: q2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNextSongs.mockResolvedValue(waiting);
  });

  it('moves the song at the given queue position', async () => {
    mockPrioritizeSong.mockResolvedValue(waiting[1]);
    await priorityCommand('g', textChannel, author, voiceChannel, '2');
    expect(mockPrioritizeSong).toHaveBeenCalledWith('g', q2);
    expect(sent()).toEqual([[{ prioritized: 's2' }, 'announce']]);
  });

  it('moves the song picked in the autocomplete by its id, wherever it is now', async () => {
    mockPrioritizeSong.mockResolvedValue(waiting[0]);
    await priorityCommand('g', textChannel, author, voiceChannel, q1);
    expect(mockPrioritizeSong).toHaveBeenCalledWith('g', q1);
  });

  it('reports a picked song that is no longer waiting, instead of moving another one', async () => {
    await priorityCommand('g', textChannel, author, voiceChannel, '33333333-3333-4333-8333-333333333333');
    expect(mockPrioritizeSong).not.toHaveBeenCalled();
    expect(sent()).toEqual([[{ error: 'queueTools.notWaiting' }, 'error']]);
  });

  it.each([undefined, '0', '3', 'abc'])('rejects the position %s', async (position) => {
    await priorityCommand('g', textChannel, author, voiceChannel, position);
    expect(mockPrioritizeSong).not.toHaveBeenCalled();
    expect(sent()).toEqual([[{ error: 'queueTools.invalidPosition' }, 'error']]);
  });

  it('reports a song that left the queue meanwhile', async () => {
    mockPrioritizeSong.mockResolvedValue(null);
    await priorityCommand('g', textChannel, author, voiceChannel, '1');
    expect(sent()).toEqual([[{ error: 'queueTools.notWaiting' }, 'error']]);
  });
});
