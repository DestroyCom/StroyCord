import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchYtdlpInfo } = vi.hoisted(() => ({ mockFetchYtdlpInfo: vi.fn() }));

vi.mock('src/config/i18n', () => ({
  default: { t: (key: string, { title }: { title: string }) => `${key}:${title}` },
}));
vi.mock('src/core/youtube', () => ({ youtubeClient: {} }));
vi.mock('src/core/ytdlp', () => ({ fetchYtdlpInfo: mockFetchYtdlpInfo }));

import { extractSongData, PreviewOnlyError } from 'src/utils/songUtils';

const user = { id: 'u1', username: 'tester' } as unknown as import('discord.js').User;
const track = (formatIds: string[]) => ({
  _type: 'video',
  title: 'Flickermood',
  uploader: 'Forss',
  duration: 213.4,
  thumbnail: 'thumb',
  webpage_url: 'https://soundcloud.com/forss/flickermood',
  formats: formatIds.map((format_id) => ({ format_id })),
});

describe('extractSongData (SoundCloud)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the yt-dlp metadata to a song, keyed by its permalink', async () => {
    mockFetchYtdlpInfo.mockResolvedValue(track(['hls_opus_64', 'http_mp3_128']));

    const song = await extractSongData('https://api.soundcloud.com/tracks/1', user, 'ch', true);

    expect(song).toMatchObject({
      title: 'Flickermood',
      videoAuthor: 'Forss',
      url: 'https://soundcloud.com/forss/flickermood',
      thumbnail: 'thumb',
      minutes: 3,
      seconds: 33,
      videoLength: '3:33',
    });
  });

  it('refuses a Go+ track that only offers previews', async () => {
    mockFetchYtdlpInfo.mockResolvedValue(track(['hls_opus_64_preview', 'http_mp3_128_preview']));

    await expect(extractSongData('https://soundcloud.com/forss/flickermood', user, 'ch', true)).rejects.toBeInstanceOf(
      PreviewOnlyError
    );
  });

  it('accepts a track that has full formats besides previews', async () => {
    mockFetchYtdlpInfo.mockResolvedValue(track(['hls_opus_64_preview', 'hls_opus_64']));

    await expect(extractSongData('https://soundcloud.com/forss/flickermood', user, 'ch', true)).resolves.toBeDefined();
  });
});
