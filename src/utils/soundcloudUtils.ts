// soundcloud.com/<user>/<track> paths whose first segment is a SoundCloud page, not a user
const RESERVED_ROOTS = new Set([
  'discover',
  'search',
  'charts',
  'stream',
  'feed',
  'you',
  'upload',
  'messages',
  'notifications',
  'settings',
  'pages',
  'tags',
  'stations',
  'people',
  'mobile',
]);
// soundcloud.com/<user>/<tab>: profile tabs, not tracks
const USER_TABS = new Set([
  'tracks',
  'albums',
  'sets',
  'reposts',
  'likes',
  'popular-tracks',
  'spotlight',
  'followers',
  'following',
  'comments',
]);
const SLUG = /^[\w-]+$/;
// Private links end with a secret token segment: /<user>/<track>/s-AbC12
const SECRET_TOKEN = /^s-[a-zA-Z\d]+$/;

export type SoundcloudLink = {
  /** `shortlink`: on.soundcloud.com, a track or a playlist, only known once resolved */
  type: 'track' | 'playlist' | 'shortlink';
  /** Canonical URL, without tracking parameters (`?si=`, `?in=`, `utm_*`) */
  url: string;
};

const parseUrl = (input: string): URL | null => {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
};

/** Any SoundCloud URL, including the api.soundcloud.com track URLs yt-dlp returns for playlist entries */
export function isSoundcloudUrl(input: string): boolean {
  const hostname = parseUrl(input)?.hostname;
  return hostname === 'soundcloud.com' || !!hostname?.endsWith('.soundcloud.com');
}

/** Recognizes the SoundCloud links a user can request: a track, a playlist / album (set) or a short link */
export function parseSoundcloudUrl(input: string): SoundcloudLink | null {
  const url = parseUrl(input);
  if (!url) return null;

  const segments = url.pathname.split('/').filter(Boolean);

  if (url.hostname === 'on.soundcloud.com') {
    return segments.length === 1 && SLUG.test(segments[0])
      ? { type: 'shortlink', url: `https://on.soundcloud.com/${segments[0]}` }
      : null;
  }
  if (!/^(?:www\.|m\.)?soundcloud\.com$/.test(url.hostname)) return null;
  if (!segments.every((segment) => SLUG.test(segment))) return null;

  const [user, ...rest] = segments;
  if (!user || RESERVED_ROOTS.has(user)) return null;
  // The token can only follow the slug (<track>/s-xxx, sets/<name>/s-xxx): a slug like `s-curve` is not one
  const tokenIndex = rest[0] === 'sets' ? 2 : 1;
  if (rest.length === tokenIndex + 1 && SECRET_TOKEN.test(rest[tokenIndex])) rest.pop();
  const canonical = `https://soundcloud.com/${segments.join('/')}`;

  if (rest.length === 1 && !USER_TABS.has(rest[0])) return { type: 'track', url: canonical };
  if (rest.length === 2 && rest[0] === 'sets') return { type: 'playlist', url: canonical };
  // A profile page or one of its tabs: not a playable request
  return null;
}
