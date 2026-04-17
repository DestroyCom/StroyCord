import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSongPlayer,
  mockSendEmbed,
  mockSendErrorEmbed,
  mockPushSongs,
  mockUpdateVoiceChannel,
  mockExtractSongData,
  mockExtractVoiceChannelData,
} = vi.hoisted(() => ({
  mockSongPlayer: vi.fn(),
  mockSendEmbed: vi.fn(),
  mockSendErrorEmbed: vi.fn(),
  mockPushSongs: vi.fn(),
  mockUpdateVoiceChannel: vi.fn(),
  mockExtractSongData: vi.fn().mockResolvedValue({ title: 'Test Song', url: 'https://youtube.com/watch?v=test' }),
  mockExtractVoiceChannelData: vi.fn().mockResolvedValue({ channelId: '1', guildId: '42' }),
}));

vi.mock('src/Bot', () => ({ activePlayers: {} }));
vi.mock('src/core/player', () => ({ songPlayer: mockSongPlayer }));
vi.mock('src/core/messages', () => ({ sendEmbed: mockSendEmbed, sendErrorEmbed: mockSendErrorEmbed }));
vi.mock('src/database/queries/guilds/update', () => ({
  pushSongs: mockPushSongs,
  updateVoiceChannel: mockUpdateVoiceChannel,
}));
vi.mock('src/utils/songUtils', () => ({
  extractSongData: mockExtractSongData,
  extractVoiceChannelData: mockExtractVoiceChannelData,
}));

import { activePlayers } from 'src/Bot';
import { songRequest } from 'src/core/requestHandlers/songRequest';

describe('songRequest', () => {
  const mockUser = { id: 'u1', username: 'testuser' } as any;
  const mockVoiceChannel = { id: 'vc1', guild: { id: '42' } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (activePlayers as any)['42'];
  });

  it('calls songPlayer when no active player exists', async () => {
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel);
    expect(mockSongPlayer).toHaveBeenCalledWith('42');
    expect(mockSendEmbed).not.toHaveBeenCalled();
  });

  it('calls sendEmbed when player is active and song is not from playlist', async () => {
    (activePlayers as any)['42'] = { audioPlayer: {} };
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel, false);
    expect(mockSendEmbed).toHaveBeenCalledWith('42', false, false);
    expect(mockSongPlayer).not.toHaveBeenCalled();
  });

  it('calls neither songPlayer nor sendEmbed when coming from playlist and player active', async () => {
    (activePlayers as any)['42'] = { audioPlayer: {} };
    await songRequest('https://youtube.com/watch?v=test', '42', mockUser, 'ch1', mockVoiceChannel, true);
    expect(mockSongPlayer).not.toHaveBeenCalled();
    expect(mockSendEmbed).not.toHaveBeenCalled();
  });
});
