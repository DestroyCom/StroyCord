import type { PlaylistVideo } from 'youtubei.js';

import { getInnertube } from './generateInnertubeClient';

export interface YtbPlaylistResult {
  id: string;
  url: string;
  title: string;
  visibility: 'link only' | 'everyone';
  description: string | null;
  total_items: number;
  views: string;
  last_updated: string;
  author: null | {
    id: string;
    name: string;
    avatar: string;
    user: string | null;
    channel_url: string;
    user_url: string | null;
  };
  items: {
    id: string;
    url: string;
    url_simple: string;
    title: string;
    thumbnail: string | undefined;
    duration: string | null;
    author: null | {
      name: string;
      ref: string;
    };
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPlaylistVideo(item: any): item is PlaylistVideo {
  return item.type === 'playlistVideo';
}

export async function fetchPlaylistData(playlistUrl: string): Promise<YtbPlaylistResult> {
  const yt = await getInnertube();

  const parsed = new URL(playlistUrl);
  const listId = parsed.searchParams.get('list');
  if (!listId) {
    throw new Error('URL de playlist invalide');
  }

  const data = await yt.getPlaylist(listId);

  if (data.info.privacy === 'PRIVATE') {
    throw new Error('Playlist privée');
  }

  return {
    id: listId,
    url: playlistUrl,
    title: data.info.title ?? 'YouTube Playlist',
    visibility: data.info.privacy === 'PRIVATE' ? 'link only' : 'everyone',
    description: data.info.description ?? null,
    total_items: Number(data.info.total_items),
    views: data.info.views ?? '0',
    last_updated: data.info.last_updated ?? '0',
    author: data.info.author
      ? {
          id: data.info.author.id,
          name: data.info.author.name,
          avatar: data.info.author.thumbnails?.[0].url ?? '',
          user: data.info.author.id,
          channel_url: data.info.author.url,
          user_url: data.info.author.url,
        }
      : null,
    items: data.items.filter(isPlaylistVideo).map((item) => ({
      id: item.id,
      url: `https://www.youtube.com/watch?v=${item.id}&list=${listId}`,
      url_simple: `https://www.youtube.com/watch?v=${item.id}`,
      title: String(item.title),
      thumbnail: item.thumbnails?.[0].url,
      duration: item.duration.text ?? null,
      author: item.author ? { name: item.author.name, ref: item.author.url } : null,
    })),
  };
}
