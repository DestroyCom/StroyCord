import { isSoundcloudUrl, parseSoundcloudUrl } from 'src/utils/soundcloudUtils';
import { describe, expect, it } from 'vitest';

describe('parseSoundcloudUrl', () => {
  it('recognizes a track', () => {
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/flickermood')).toEqual({
      type: 'track',
      url: 'https://soundcloud.com/forss/flickermood',
    });
  });

  it('strips tracking parameters and normalizes www / m hosts', () => {
    expect(parseSoundcloudUrl('https://m.soundcloud.com/forss/flickermood?si=abc&utm_source=clipboard')?.url).toBe(
      'https://soundcloud.com/forss/flickermood'
    );
    expect(parseSoundcloudUrl('https://www.soundcloud.com/forss/flickermood?in=forss/sets/soulhack')).toEqual({
      type: 'track',
      url: 'https://soundcloud.com/forss/flickermood',
    });
  });

  it('keeps the secret token of a private track or set', () => {
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/flickermood/s-AbC12')).toEqual({
      type: 'track',
      url: 'https://soundcloud.com/forss/flickermood/s-AbC12',
    });
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/sets/soulhack/s-AbC12')?.type).toBe('playlist');
  });

  it('recognizes a playlist / album (set)', () => {
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/sets/soulhack')).toEqual({
      type: 'playlist',
      url: 'https://soundcloud.com/forss/sets/soulhack',
    });
  });

  it('recognizes a short link', () => {
    expect(parseSoundcloudUrl('https://on.soundcloud.com/AbCdEf123')).toEqual({
      type: 'shortlink',
      url: 'https://on.soundcloud.com/AbCdEf123',
    });
  });

  it('rejects profiles, their tabs and SoundCloud pages', () => {
    expect(parseSoundcloudUrl('https://soundcloud.com/forss')).toBeNull();
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/tracks')).toBeNull();
    expect(parseSoundcloudUrl('https://soundcloud.com/forss/likes')).toBeNull();
    expect(parseSoundcloudUrl('https://soundcloud.com/discover/sets/weekly')).toBeNull();
    expect(parseSoundcloudUrl('https://soundcloud.com/search?q=daft')).toBeNull();
  });

  it('rejects other sites, look-alike hosts and plain text', () => {
    expect(parseSoundcloudUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseSoundcloudUrl('https://soundcloud.com.evil.com/forss/flickermood')).toBeNull();
    expect(parseSoundcloudUrl('ftp://soundcloud.com/forss/flickermood')).toBeNull();
    expect(parseSoundcloudUrl('daft punk')).toBeNull();
  });
});

describe('isSoundcloudUrl', () => {
  it('accepts every SoundCloud host, including the API urls of playlist entries', () => {
    expect(isSoundcloudUrl('https://soundcloud.com/forss/flickermood')).toBe(true);
    expect(isSoundcloudUrl('https://api.soundcloud.com/tracks/123456')).toBe(true);
    expect(isSoundcloudUrl('https://on.soundcloud.com/AbCdEf123')).toBe(true);
  });

  it('rejects other urls', () => {
    expect(isSoundcloudUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isSoundcloudUrl('https://notsoundcloud.com/a/b')).toBe(false);
    expect(isSoundcloudUrl('dQw4w9WgXcQ')).toBe(false);
  });
});
