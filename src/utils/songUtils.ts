import type { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import { extractVideoId } from 'src/utils/youtubeUtils';

import type { songInterface } from './interfaces';

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  const videoId = extractVideoId(url);
  let info: Awaited<ReturnType<typeof youtubeClient.getBasicInfo>>;
  try {
    info = await youtubeClient.getBasicInfo(videoId);
  } catch (e) {
    throw new Error(`Failed to fetch video info: ${String(e)}`);
  }

  const b = info.basic_info;
  const title = b.title ?? '';
  const videoAuthor = b.author ?? '';
  const duration = b.duration ?? 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  const thumbnails = b.thumbnail ?? [];
  const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';
  const videoUrl = `https://www.youtube.com/watch?v=${b.id ?? videoId}`;

  return {
    title,
    url: videoUrl,
    thumbnail,
    videoAuthor,
    videoLength: minutes === 0 && seconds === 0 ? '`Livestream`' : formattedTime,
    minutes,
    seconds,
    requestDateTimestamp: Date.now(),
    requestAuthor: {
      id: Author.id,
      username: Author.username,
    },
    requestChannel,
    isQueueStart,
    isComingFromPlaylist,
  };
};

export const extractVoiceChannelData = async (
  voiceChannel: VoiceBasedChannel
): Promise<{
  channelId: string;
  guildId: string;
  guild: Guild;
  adapterCreator: InternalDiscordGatewayAdapterCreator;
}> => {
  return {
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    guild: voiceChannel.guild,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  };
};
