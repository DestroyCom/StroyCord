import type { Guild, InternalDiscordGatewayAdapterCreator, User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import { fetchYtdlpInfo } from 'src/core/ytdlp';
import { isSoundcloudUrl } from 'src/utils/soundcloudUtils';
import { extractVideoId } from 'src/utils/youtubeUtils';

import type { songInterface } from './interfaces';

type SongMetadata = Pick<songInterface, 'title' | 'url' | 'thumbnail' | 'videoAuthor'> & { duration: number };

const fetchYoutubeMetadata = async (url: string): Promise<SongMetadata> => {
  const videoId = extractVideoId(url);
  let info: Awaited<ReturnType<typeof youtubeClient.getBasicInfo>>;
  try {
    info = await youtubeClient.getBasicInfo(videoId);
  } catch (e) {
    throw new Error(`Failed to fetch video info: ${String(e)}`);
  }

  const b = info.basic_info;
  const thumbnails = b.thumbnail ?? [];
  return {
    title: b.title ?? '',
    url: `https://www.youtube.com/watch?v=${b.id ?? videoId}`,
    thumbnail: thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '',
    videoAuthor: b.author ?? '',
    duration: b.duration ?? 0,
  };
};

const fetchSoundcloudMetadata = async (url: string): Promise<SongMetadata> => {
  let info: Awaited<ReturnType<typeof fetchYtdlpInfo>>;
  try {
    info = await fetchYtdlpInfo(url);
  } catch (e) {
    throw new Error(`Failed to fetch SoundCloud track info: ${String(e)}`);
  }
  if (info._type === 'playlist') throw new Error('This SoundCloud link is a playlist, not a track');

  return {
    title: info.title ?? '',
    // The permalink (playlist entries can be api.soundcloud.com urls): stable key for the stats
    url: info.webpage_url ?? url,
    thumbnail: info.thumbnail ?? '',
    videoAuthor: info.uploader ?? '',
    duration: Math.round(info.duration ?? 0),
  };
};

export const extractSongData = async (
  url: string,
  Author: User,
  requestChannel: string,
  isQueueStart: boolean,
  isComingFromPlaylist: boolean = false
): Promise<songInterface> => {
  const { duration, ...metadata } = isSoundcloudUrl(url)
    ? await fetchSoundcloudMetadata(url)
    : await fetchYoutubeMetadata(url);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  return {
    ...metadata,
    videoLength: minutes === 0 && seconds === 0 ? 'Livestream' : formattedTime,
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
