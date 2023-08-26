import { User, VoiceBasedChannel } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { pushSongs, updateVoiceChannel } from 'src/database/queries/guilds/update';
import { extractSongData, extractVoiceChannelData } from 'src/utils/utils';

import { sendEmbed } from '../messages';
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

  const parsedSong = await extractSongData(url, requestAuthor, textChannelId, !activePlayerGuild, isComingFromPlaylist);
  const parsedVoiceChannel = await extractVoiceChannelData(voiceChannel!);

  await pushSongs(guildId, [parsedSong]);
  await updateVoiceChannel(guildId, parsedVoiceChannel);

  if (!activePlayerGuild && !isComingFromPlaylist) {
    await songPlayer(guildId);
  } else if (!activePlayerGuild && isComingFromPlaylist) {
    await songPlayer(guildId);
  } else if (!isComingFromPlaylist) {
    const isNewSong = !activePlayerGuild;
    await sendEmbed(guildId, isNewSong, false);
  }
};
