import { extractPlaylistId, extractVideoId, parseCookiesTxt, yt_validate } from 'src/utils/youtubeUtils';
import { describe, expect, it } from 'vitest';

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

  it('returns "playlist" for a video opened from a playlist', () => {
    expect(yt_validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-')).toBe(
      'playlist'
    );
  });

  it('returns "video" for a video carrying its auto-generated mix', () => {
    expect(yt_validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1')).toBe('video');
  });

  it('returns "video" for a share link carrying its mix', () => {
    expect(yt_validate('https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ&si=abc')).toBe('video');
    expect(yt_validate('https://www.youtube.com/watch?list=RDdQw4w9WgXcQ&v=dQw4w9WgXcQ')).toBe('video');
  });
});

describe('extractPlaylistId', () => {
  it('extracts the id from a playlist URL', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-')).toBe(
      'PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-'
    );
  });

  it('extracts the id from a watch URL', () => {
    expect(
      extractPlaylistId('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-&index=2')
    ).toBe('PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-');
  });

  it('returns a raw id as is', () => {
    expect(extractPlaylistId('PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-')).toBe('PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-');
  });
});

describe('extractVideoId', () => {
  it('extracts ID when v= is not the first parameter', () => {
    expect(extractVideoId('https://www.youtube.com/watch?list=RDdQw4w9WgXcQ&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from full watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns raw ID unchanged', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('ignores extra query params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });
});

describe('parseCookiesTxt', () => {
  it('converts Netscape cookies to header string', () => {
    const input = [
      '# Netscape HTTP Cookie File',
      '.youtube.com\tTRUE\t/\tTRUE\t1234567890\tVISITOR_INFO1_LIVE\tabc123',
      '.youtube.com\tTRUE\t/\tFALSE\t9999999999\tYSC\txyz789',
    ].join('\n');
    expect(parseCookiesTxt(input)).toBe('VISITOR_INFO1_LIVE=abc123; YSC=xyz789');
  });

  it('ignores comment and empty lines', () => {
    const input = '# comment\n\n.youtube.com\tTRUE\t/\tTRUE\t0\tFOO\tBAR\n';
    expect(parseCookiesTxt(input)).toBe('FOO=BAR');
  });

  it('returns empty string for file with only comments', () => {
    expect(parseCookiesTxt('# nothing here\n')).toBe('');
  });
});
