import type { AudioResource } from '@discordjs/voice';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInsertPlay, mockGetGuildSettings } = vi.hoisted(() => ({
  mockInsertPlay: vi.fn(),
  mockGetGuildSettings: vi.fn(),
}));

vi.mock('src/config/monitoring', () => ({ captureError: vi.fn() }));
vi.mock('src/core/settings', () => ({ getGuildSettings: mockGetGuildSettings }));
vi.mock('src/database/queries/plays', () => ({ insertPlay: mockInsertPlay }));

import { trackPlay } from 'src/core/stats';

const song = {
  title: 'Song',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  videoAuthor: 'Artist',
  minutes: 3,
  seconds: 20,
  requestAuthor: { id: 'u1', username: 'alice' },
  isComingFromPlaylist: false,
};

const resource = (playbackDuration: number) =>
  ({ metadata: song, playbackDuration }) as unknown as AudioResource<unknown>;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('trackPlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGuildSettings.mockResolvedValue({ statsEnabled: true });
  });

  it('records a full listen', async () => {
    trackPlay('g1', resource(200_000));
    await flush();
    expect(mockInsertPlay).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'g1',
        videoId: 'dQw4w9WgXcQ',
        durationSec: 200,
        listenedMs: 200_000,
        requestedBy: { id: 'u1', username: 'alice' },
        skipped: false,
      })
    );
  });

  it('flags a song stopped before 90% as skipped', async () => {
    trackPlay('g1', resource(60_000));
    await flush();
    expect(mockInsertPlay).toHaveBeenCalledWith(expect.objectContaining({ skipped: true }));
  });

  it('records a resource only once', async () => {
    const res = resource(60_000);
    trackPlay('g1', res);
    trackPlay('g1', res);
    await flush();
    expect(mockInsertPlay).toHaveBeenCalledTimes(1);
  });

  it('ignores very short plays', async () => {
    trackPlay('g1', resource(4_000));
    await flush();
    expect(mockInsertPlay).not.toHaveBeenCalled();
  });

  it('records nothing when the guild disabled stats', async () => {
    mockGetGuildSettings.mockResolvedValue({ statsEnabled: false });
    trackPlay('g1', resource(60_000));
    await flush();
    expect(mockInsertPlay).not.toHaveBeenCalled();
  });
});
