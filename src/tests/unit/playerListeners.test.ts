import { EventEmitter } from 'node:events';
import { AudioPlayerStatus } from '@discordjs/voice';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockTrackPlay, mockSkipSong, mockSendEmbed } = vi.hoisted(() => ({
  mockTrackPlay: vi.fn(),
  mockSkipSong: vi.fn(),
  mockSendEmbed: vi.fn(),
}));

vi.mock('src/config/monitoring', () => ({ captureError: vi.fn() }));
vi.mock('src/core/messages', () => ({ sendEmbed: mockSendEmbed }));
vi.mock('src/core/player', () => ({ remove: vi.fn(), skipSong: mockSkipSong }));
vi.mock('src/core/settings', () => ({ withGuildSettings: (_: string, fn: () => unknown) => Promise.resolve(fn()) }));
vi.mock('src/core/stats', () => ({ trackPlay: mockTrackPlay }));
vi.mock('src/database/queries/guilds/update', () => ({ shiftSongs: vi.fn() }));

import type { AudioPlayer } from '@discordjs/voice';
import { createAudioPlayerListener } from 'src/listeners/playerListeners';

const songA = { id: 'a' };
const songB = { id: 'b' };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('audio player listener stats', () => {
  let player: EventEmitter;

  beforeEach(() => {
    vi.clearAllMocks();
    player = new EventEmitter();
    createAudioPlayerListener(player as unknown as AudioPlayer, 'g1');
  });

  it('records the song when it ends', async () => {
    player.emit(
      'stateChange',
      { status: AudioPlayerStatus.Playing, resource: songA },
      { status: AudioPlayerStatus.Idle }
    );
    await flush();
    expect(mockTrackPlay).toHaveBeenCalledWith('g1', songA);
    expect(mockSkipSong).toHaveBeenCalledWith('g1');
  });

  it('records the song when it is skipped for the next one', async () => {
    player.emit(
      'stateChange',
      { status: AudioPlayerStatus.Playing, resource: songA },
      { status: AudioPlayerStatus.Buffering, resource: songB }
    );
    await flush();
    expect(mockTrackPlay).toHaveBeenCalledWith('g1', songA);
  });

  it('records nothing on pause or once playback starts', async () => {
    player.emit(
      'stateChange',
      { status: AudioPlayerStatus.Playing, resource: songA },
      { status: AudioPlayerStatus.Paused, resource: songA }
    );
    player.emit(
      'stateChange',
      { status: AudioPlayerStatus.Buffering, resource: songB },
      { status: AudioPlayerStatus.Playing, resource: songB }
    );
    await flush();
    expect(mockTrackPlay).not.toHaveBeenCalled();
    expect(mockSendEmbed).toHaveBeenCalledWith('g1');
  });
});
