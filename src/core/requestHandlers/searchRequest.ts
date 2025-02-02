import ytsr from '@distube/ytsr';
import { User, VoiceBasedChannel } from 'discord.js';

import { songRequest } from './songRequest';

export const searchSong = async (
  searchInput: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const searchedVideo = await ytsr(searchInput, { limit: 1 });
  const video = searchedVideo.items[0];

  songRequest(video.url, guildId, requestAuthor, textChannelId, voiceChannel);
};
