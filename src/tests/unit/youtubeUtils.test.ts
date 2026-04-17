import { describe, expect, it } from 'vitest';
import { yt_validate } from 'src/utils/youtubeUtils';

describe('yt_validate', () => {
  it('returns "video" for a standard YouTube URL', () => {
    expect(yt_validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "video" for a youtu.be short URL', () => {
    expect(yt_validate('https://youtu.be/dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "video" for a YouTube Shorts URL', () => {
    expect(yt_validate('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('video');
  });

  it('returns "playlist" for a playlist URL', () => {
    expect(yt_validate('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-')).toBe('playlist');
  });

  it('returns "search" for plain text', () => {
    expect(yt_validate('daft punk harder better faster stronger')).toBe('search');
  });

  it('returns false for an unrecognized https URL', () => {
    expect(yt_validate('https://example.com/video')).toBe(false);
  });

  it('returns "video" for a raw video ID', () => {
    expect(yt_validate('dQw4w9WgXcQ')).toBe('video');
  });
});
