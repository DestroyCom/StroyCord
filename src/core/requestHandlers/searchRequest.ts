import ytsr from '@distube/ytsr';
import { User, VoiceBasedChannel } from 'discord.js';
import { sendErrorEmbed } from 'src/core/messages';

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

  if (!video) {
    await sendErrorEmbed(guildId, textChannelId, 'No results found for: ' + searchInput);
    return;
  }

  await songRequest(video.url, guildId, requestAuthor, textChannelId, voiceChannel);
};
