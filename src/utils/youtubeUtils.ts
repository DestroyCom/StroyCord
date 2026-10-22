const video_id_pattern = /^[a-zA-Z\d_-]{11,12}$/;
const playlist_id_pattern = /^(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}$/;
const video_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|shorts\/|embed\/|live\/|v\/)?)([\w-]+)(\S+)?$/;
const playlist_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))\/(?:(playlist|watch))?(.*)?((\?|&)list=)(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}(&.*)?$/;

export function yt_validate(url: string): 'playlist' | 'video' | 'search' | false {
  const url_ = url.trim();
  if (url_.indexOf('list=') === -1) {
    if (url_.startsWith('https')) {
      if (url_.match(video_pattern)) {
        let id: string;
        if (url_.includes('youtu.be/')) id = url_.split('youtu.be/')[1].split(/(\?|\/|&)/)[0];
        else if (url_.includes('youtube.com/embed/')) id = url_.split('youtube.com/embed/')[1].split(/(\?|\/|&)/)[0];
        else if (url_.includes('youtube.com/shorts/')) id = url_.split('youtube.com/shorts/')[1].split(/(\?|\/|&)/)[0];
        else id = url_.split('watch?v=')[1]?.split(/(\?|\/|&)/)[0];
        if (id?.match(video_id_pattern)) return 'video';
        else return false;
      } else return false;
    } else {
      if (url_.match(video_id_pattern)) return 'video';
      else if (url_.match(playlist_id_pattern)) return 'playlist';
      else return 'search';
    }
  } else {
    // A video opened from YouTube's home often carries its auto-generated mix (list=RD…):
    // the user meant the video, not an endless radio
    const hasVideo = /[?&]v=/.test(url_) || /youtu\.be\/[\w-]{11}/.test(url_);
    const isMixOnVideo = hasVideo && /[?&]list=RD/.test(url_);
    if (!url_.match(playlist_pattern) || isMixOnVideo) {
      // `?list=…&v=…` keeps its `?`: `watch&v=…` would no longer be a valid URL
      return yt_validate(url_.replace(/\?list=[^&]*&/, '?').replace(/[?&]list=[^&]*/, ''));
    }
    return 'playlist';
  }
}

/** Playlist id of a playlist URL (`list=` parameter), or the input itself when it is already an id */
export function extractPlaylistId(urlOrId: string): string {
  const input = urlOrId.trim();
  return input.match(/[?&]list=([\w-]+)/)?.[1] ?? input;
}

export function extractVideoId(urlOrId: string): string {
  const url = urlOrId.trim();
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split(/[?&/]/)[0];
  const videoParam = url.match(/[?&]v=([\w-]+)/);
  if (videoParam) return videoParam[1];
  const pathMatch = url.match(/(?:shorts|embed|live)\/([a-zA-Z\d_-]{11,12})/);
  if (pathMatch) return pathMatch[1];
  return url;
}

export function parseCookiesTxt(content: string): string {
  return content
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split('\t');
      if (parts.length >= 7) return `${parts[5].trim()}=${parts[6].trim()}`;
      return null;
    })
    .filter((c): c is string => c !== null)
    .join('; ');
}
