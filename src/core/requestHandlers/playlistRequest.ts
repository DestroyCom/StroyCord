import ytpl from '@distube/ytpl';
import { User, VoiceBasedChannel } from 'discord.js';

import { sendQueueEmbed } from '../messages';
import { songRequest } from './songRequest';

export const playlistHandler = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const playlistData = await ytpl(url);
  const playlistVideos = playlistData.items;

  for (let i = 0; i < playlistVideos.length; i++) {
    const video = playlistVideos[i];
    if (video.url === undefined) continue;
    try {
      await songRequest(video.url, guildId, requestAuthor, textChannelId, voiceChannel, true);
    } catch (error) {
      console.log('error in playlistHandler');
    }
  }

  sendQueueEmbed(guildId, playlistData, textChannelId, requestAuthor);
};
