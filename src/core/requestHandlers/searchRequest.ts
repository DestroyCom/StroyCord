import { User, VoiceBasedChannel } from 'discord.js';
import { search } from 'play-dl';

import { songRequest } from './songRequest';

export const searchSong = async (
  searchInput: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const searchedVideo = await search(searchInput, { limit: 1 });

  songRequest(searchedVideo[0].url, guildId, requestAuthor, textChannelId, voiceChannel);
};
