import ytdl from '@distube/ytdl-core';
import type { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';

import type { songInterface } from './interfaces';

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  let info;
  try {
    info = await ytdl.getInfo(url);
  } catch (e) {
    throw new Error(`Failed to fetch video info: ${String(e)}`);
  }
  const rawSongData = info.videoDetails;

  const title = rawSongData.title || '';
  const videoAuthor = rawSongData.author?.name || '';
  const minutes = Math.floor(Number(rawSongData.lengthSeconds) / 60);
  const seconds = Number(rawSongData.lengthSeconds) % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  return {
    title,
    url: rawSongData.video_url,
    thumbnail: rawSongData.thumbnails[rawSongData.thumbnails.length - 1].url,
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
