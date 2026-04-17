import type { User, VoiceBasedChannel } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { pushSongs, updateVoiceChannel } from 'src/database/queries/guilds/update';
import { extractSongData, extractVoiceChannelData } from 'src/utils/songUtils';

import { sendEmbed, sendErrorEmbed } from '../messages';
import { songPlayer } from '../player';

export const songRequest = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null,
  isComingFromPlaylist: boolean = false
) => {
  const activePlayerGuild = activePlayers[guildId];

  try {
    const parsedSong = await extractSongData(
      url,
      requestAuthor,
      textChannelId,
      !activePlayerGuild,
      isComingFromPlaylist
    );
    const parsedVoiceChannel = await extractVoiceChannelData(voiceChannel!);

    await pushSongs(guildId, [parsedSong]);
    await updateVoiceChannel(guildId, parsedVoiceChannel);

    if (!activePlayerGuild) {
      await songPlayer(guildId);
    } else if (!isComingFromPlaylist) {
      await sendEmbed(guildId, false, false);
    }
  } catch (error) {
    await sendErrorEmbed(guildId, textChannelId, String(error));
  }
};
