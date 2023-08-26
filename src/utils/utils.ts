import { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';
import { video_info } from 'play-dl';

import { secrets } from '../config/secrets';
import { MessageFormaterInterface, songInterface } from './interfaces';

export const messageFormater = (message: string): MessageFormaterInterface => {
  return {
    splittedMessage: message.split(' '),
    command: message.split(' ')[0].slice(secrets.PREFIX.length),
  };
};

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  const rawSongData = await video_info(url);

  const title = rawSongData.video_details.title || '';
  const videoAuthor = rawSongData.video_details.channel?.name || '';
  const minutes = Math.floor(rawSongData.video_details.durationInSec / 60);
  const seconds = rawSongData.video_details.durationInSec % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  return {
    title,
    url: rawSongData.video_details.url,
    thumbnail: rawSongData.video_details.thumbnails[rawSongData.video_details.thumbnails.length - 1].url,
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
