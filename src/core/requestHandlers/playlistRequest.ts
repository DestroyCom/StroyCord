import type { User, VoiceBasedChannel } from 'discord.js';
import { captureError } from 'src/config/monitoring';
import { QUEUE_LIMIT_CAP } from 'src/config/settings';
import { youtubeClient } from 'src/core/youtube';
import { fetchYtdlpInfo } from 'src/core/ytdlp';
import type { QueueLimitReason } from 'src/database/queries/guilds/update';
import type { PlaylistInfo } from 'src/utils/interfaces';
import { isSoundcloudUrl } from 'src/utils/soundcloudUtils';
import { extractPlaylistId } from 'src/utils/youtubeUtils';

import { sendErrorEmbed, sendQueueEmbed } from '../messages';
import { songRequest } from './songRequest';

// The queue can't hold more songs: no need to read further
const MAX_PLAYLIST_ITEMS = QUEUE_LIMIT_CAP;

type ResolvedPlaylist = {
  title: string;
  author: string;
  items: Array<{ url: string; thumbnail?: string }>;
};

type PlaylistVideo = Awaited<ReturnType<typeof youtubeClient.getPlaylist>>['videos'][number];

// Recent YouTube layouts return LockupViews, which carry the video id as content_id
const videoIdOf = (video: PlaylistVideo): string | undefined =>
  'content_id' in video ? video.content_id : 'id' in video ? video.id : undefined;

const thumbnailOf = (video: PlaylistVideo): string | undefined => {
  if ('thumbnails' in video) return video.thumbnails?.[0]?.url;
  const image = 'content_image' in video ? video.content_image : null;
  return image && 'image' in image ? image.image?.[0]?.url : undefined;
};

const resolveYoutubePlaylist = async (url: string): Promise<ResolvedPlaylist> => {
  // getPlaylist expects the playlist id, not the URL
  let page = await youtubeClient.getPlaylist(extractPlaylistId(url));
  const { info } = page;
  const videos = [...page.videos];
  // A page holds ~100 videos, the following ones come through continuations
  while (page.has_continuation && videos.length < MAX_PLAYLIST_ITEMS) {
    page = await page.getContinuation();
    videos.push(...page.videos);
  }

  return {
    title: info.title?.toString() ?? '',
    author: info.author?.name?.toString() ?? '',
    items: videos
      .map((video) => ({ id: videoIdOf(video), thumbnail: thumbnailOf(video) }))
      .filter((video): video is { id: string; thumbnail: string | undefined } => !!video.id)
      .slice(0, MAX_PLAYLIST_ITEMS)
      .map(({ id, thumbnail }) => ({ url: `https://www.youtube.com/watch?v=${id}`, thumbnail })),
  };
};

/** A SoundCloud set, or `null` when the link (a short link) turns out to be a single track */
const resolveSoundcloudPlaylist = async (url: string): Promise<ResolvedPlaylist | null> => {
  const info = await fetchYtdlpInfo(url);
  if (info._type !== 'playlist') return null;

  return {
    title: info.title ?? '',
    author: info.uploader ?? '',
    items: (info.entries ?? [])
      .map((entry) => entry.url ?? entry.webpage_url)
      .filter((entryUrl): entryUrl is string => !!entryUrl)
      .slice(0, MAX_PLAYLIST_ITEMS)
      .map((entryUrl) => ({ url: entryUrl })),
  };
};

export const playlistHandler = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  let playlist: ResolvedPlaylist | null;
  try {
    playlist = isSoundcloudUrl(url) ? await resolveSoundcloudPlaylist(url) : await resolveYoutubePlaylist(url);
  } catch (error) {
    // Private, deleted or unavailable playlist
    captureError(error, { guildId, url, step: 'playlistHandler' });
    await sendErrorEmbed(guildId, textChannelId, `Failed to load playlist: ${String(error)}`);
    return;
  }
  if (!playlist) {
    await songRequest(url, guildId, requestAuthor, textChannelId, voiceChannel);
    return;
  }

  let addedCount = 0;
  let limitReached: QueueLimitReason | undefined;
  for (const item of playlist.items) {
    try {
      const result = await songRequest(item.url, guildId, requestAuthor, textChannelId, voiceChannel, true);
      if (result === 'queued') addedCount++;
      // Stop at the first limit: the remaining songs would be rejected too (and cost a request each)
      if (result === 'queueFull' || result === 'userLimit') {
        limitReached = result;
        break;
      }
    } catch (e) {
      console.error('[playlistHandler] failed to process song:', e);
    }
  }

  const playlistInfo: PlaylistInfo = {
    url,
    title: playlist.title,
    author: { name: playlist.author },
    items: playlist.items,
    addedCount,
    skippedCount: playlist.items.length - addedCount,
    limitReached,
  };

  sendQueueEmbed(guildId, playlistInfo, textChannelId, requestAuthor);
};
