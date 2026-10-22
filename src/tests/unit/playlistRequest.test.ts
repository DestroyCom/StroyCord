import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSongRequest, mockSendQueueEmbed, mockSendErrorEmbed, mockGetPlaylist, mockFetchYtdlpInfo } = vi.hoisted(
  () => ({
    mockSongRequest: vi.fn().mockResolvedValue('queued'),
    mockSendQueueEmbed: vi.fn(),
    mockSendErrorEmbed: vi.fn(),
    mockGetPlaylist: vi.fn(),
    mockFetchYtdlpInfo: vi.fn(),
  })
);

vi.mock('src/config/settings', () => ({ QUEUE_LIMIT_CAP: 500 }));
vi.mock('src/config/monitoring', () => ({ captureError: vi.fn() }));
vi.mock('src/core/youtube', () => ({ youtubeClient: { getPlaylist: mockGetPlaylist } }));
vi.mock('src/core/ytdlp', () => ({ fetchYtdlpInfo: mockFetchYtdlpInfo }));
vi.mock('src/core/messages', () => ({ sendQueueEmbed: mockSendQueueEmbed, sendErrorEmbed: mockSendErrorEmbed }));
vi.mock('src/core/requestHandlers/songRequest', () => ({ songRequest: mockSongRequest }));

import { playlistHandler } from 'src/core/requestHandlers/playlistRequest';

const user = { id: 'u1', username: 'tester' } as unknown as import('discord.js').User;
const page = (ids: string[], next?: object) => ({
  info: { title: 'My playlist', author: { name: 'Me' } },
  videos: ids.map((id) => ({ id, thumbnails: [{ url: `thumb-${id}` }] })),
  has_continuation: !!next,
  getContinuation: vi.fn().mockResolvedValue(next),
});

describe('playlistHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSongRequest.mockResolvedValue('queued');
  });

  it('loads a YouTube playlist by id, through every page', async () => {
    mockGetPlaylist.mockResolvedValue(page(['aaaaaaaaaaa'], page(['bbbbbbbbbbb'])));

    await playlistHandler('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-', 'g', user, 'ch');

    expect(mockGetPlaylist).toHaveBeenCalledWith('PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-');
    expect(mockSongRequest.mock.calls.map((call) => call[0])).toEqual([
      'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      'https://www.youtube.com/watch?v=bbbbbbbbbbb',
    ]);
    expect(mockSendQueueEmbed.mock.calls[0][1]).toMatchObject({ title: 'My playlist', addedCount: 2, skippedCount: 0 });
  });

  it('reads the video id of LockupView items', async () => {
    mockGetPlaylist.mockResolvedValue({
      ...page([]),
      videos: [{ content_id: 'ccccccccccc', content_image: { image: [{ url: 'thumb' }] } }],
    });

    await playlistHandler('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-', 'g', user, 'ch');

    expect(mockSongRequest).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=ccccccccccc',
      'g',
      user,
      'ch',
      undefined,
      true
    );
  });

  it('queues every entry of a SoundCloud set and stops at the first limit', async () => {
    mockFetchYtdlpInfo.mockResolvedValue({
      _type: 'playlist',
      title: 'Soulhack',
      uploader: 'Forss',
      entries: [
        { url: 'https://soundcloud.com/forss/one' },
        { url: 'https://api.soundcloud.com/tracks/2' },
        { url: 'https://soundcloud.com/forss/three' },
      ],
    });
    mockSongRequest.mockResolvedValueOnce('queued').mockResolvedValueOnce('queueFull');

    await playlistHandler('https://soundcloud.com/forss/sets/soulhack', 'g', user, 'ch');

    expect(mockSongRequest).toHaveBeenCalledTimes(2);
    expect(mockSongRequest.mock.calls[1][0]).toBe('https://api.soundcloud.com/tracks/2');
    expect(mockSendQueueEmbed.mock.calls[0][1]).toMatchObject({
      title: 'Soulhack',
      author: { name: 'Forss' },
      addedCount: 1,
      skippedCount: 2,
      limitReached: 'queueFull',
    });
  });

  it('plays a SoundCloud short link that resolves to a single track', async () => {
    mockFetchYtdlpInfo.mockResolvedValue({ _type: 'video', title: 'Flickermood' });

    await playlistHandler('https://on.soundcloud.com/AbC', 'g', user, 'ch');

    expect(mockSongRequest).toHaveBeenCalledWith('https://on.soundcloud.com/AbC', 'g', user, 'ch', undefined);
    expect(mockSendQueueEmbed).not.toHaveBeenCalled();
  });

  it('reports a playlist that cannot be loaded', async () => {
    mockGetPlaylist.mockRejectedValue(new Error('This playlist is private'));

    await playlistHandler('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-', 'g', user, 'ch');

    expect(mockSendErrorEmbed).toHaveBeenCalledWith('g', 'ch', expect.stringContaining('This playlist is private'));
    expect(mockSongRequest).not.toHaveBeenCalled();
  });
});
