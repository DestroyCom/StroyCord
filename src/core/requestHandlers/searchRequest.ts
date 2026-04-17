import type { User, VoiceBasedChannel } from 'discord.js';
import { youtubeClient } from 'src/core/youtube';
import { sendErrorEmbed } from 'src/core/messages';

import { songRequest } from './songRequest';

export const searchSong = async (
  searchInput: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null
) => {
  const results = await youtubeClient.search(searchInput);
  const firstVideo = results.videos?.[0];

  if (!firstVideo?.id) {
    await sendErrorEmbed(guildId, textChannelId, `No results found for: ${searchInput}`);
    return;
  }

  await songRequest(
    `https://www.youtube.com/watch?v=${firstVideo.id}`,
    guildId,
    requestAuthor,
    textChannelId,
    voiceChannel
  );
};
