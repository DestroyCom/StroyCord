import type { User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import type { QueueLimitReason } from 'src/database/queries/guilds/update';
import type { PlaylistInfo } from 'src/utils/interfaces';

import { sendQueueEmbed } from '../messages';
import { songRequest } from './songRequest';

export const playlistHandler = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const playlist = await youtubeClient.getPlaylist(url);
  let addedCount = 0;
  let limitReached: QueueLimitReason | undefined;

  for (const video of playlist.videos) {
    if (!video.id) continue;
    try {
      const result = await songRequest(
        `https://www.youtube.com/watch?v=${video.id}`,
        guildId,
        requestAuthor,
        textChannelId,
        voiceChannel,
        true
      );
      if (result === 'queued') addedCount++;
      // Stop at the first limit: the remaining songs would be rejected too (and cost a YouTube call each)
      if (result === 'queueFull' || result === 'userLimit') {
        limitReached = result;
        break;
      }
    } catch (e) {
      console.error('[playlistHandler] failed to process video:', e);
    }
  }

  const playlistInfo: PlaylistInfo = {
    url,
    title: playlist.info.title?.toString() ?? '',
    author: { name: playlist.info.author?.name?.toString() ?? '' },
    items: playlist.videos.map((v) => ({
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail: v.thumbnails?.[0]?.url,
    })),
    addedCount,
    skippedCount: playlist.videos.filter((v) => 'id' in v && v.id).length - addedCount,
    limitReached,
  };

  sendQueueEmbed(guildId, playlistInfo, textChannelId, requestAuthor);
};
