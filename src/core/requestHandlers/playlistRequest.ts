import type { User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
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

  for (const video of playlist.videos) {
    if (!video.id) continue;
    try {
      await songRequest(
        `https://www.youtube.com/watch?v=${video.id}`,
        guildId,
        requestAuthor,
        textChannelId,
        voiceChannel,
        true
      );
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
  };

  sendQueueEmbed(guildId, playlistInfo, textChannelId, requestAuthor);
};
