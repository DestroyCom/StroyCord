import ytdl from '@distube/ytdl-core';
import axios from 'axios';
import { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';

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
  const info = await ytdl.getInfo(url);
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

const video_id_pattern = /^[a-zA-Z\d_-]{11,12}$/;
const playlist_id_pattern = /^(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}$/;
const video_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|shorts\/|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/;
const playlist_pattern =
  /^((?:https?:)?\/\/)?(?:(?:www|m|music)\.)?((?:youtube\.com|youtu.be))\/(?:(playlist|watch))?(.*)?((\?|\&)list=)(PL|UU|LL|RD|OL)[a-zA-Z\d_-]{10,}(&.*)?$/;
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
    if (!url_.match(playlist_pattern)) return yt_validate(url_.replace(/(\?|\&)list=[^&]*/, ''));
    else return 'playlist';
  }
}

export async function getAudioStream(url: string) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return response.data;
}
