import type { User, VoiceBasedChannel } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { captureError } from 'src/config/monitoring';
import { getGuildSettings } from 'src/core/settings';
import { pushSongIfAllowed, type QueueLimitReason, updateVoiceChannel } from 'src/database/queries/guilds/update';
import { queueLimitEmbed } from 'src/utils/embeds/errorsEmbed';
import { extractSongData, extractVoiceChannelData, PreviewOnlyError } from 'src/utils/songUtils';

import { sendEmbed, sendEmbedToChannel, sendErrorEmbed } from '../messages';
import { songPlayer } from '../player';

export const songRequest = async (
  url: string,
  guildId: string,
  requestAuthor: User,
  textChannelId: string,
  voiceChannel?: VoiceBasedChannel | null,
  isComingFromPlaylist: boolean = false
): Promise<'queued' | QueueLimitReason | 'error'> => {
  const activePlayerGuild = activePlayers[guildId];

  try {
    const parsedSong = await extractSongData(
      url,
      requestAuthor,
      textChannelId,
      !activePlayerGuild,
      isComingFromPlaylist
    );
    if (!voiceChannel) {
      throw new Error('No voice channel provided');
    }
    const parsedVoiceChannel = await extractVoiceChannelData(voiceChannel);

    const settings = await getGuildSettings(guildId);
    const result = await pushSongIfAllowed(guildId, parsedSong, settings);
    if (result !== 'queued') {
      // A playlist reports the skipped songs once, in its own embed
      if (!isComingFromPlaylist) await sendEmbedToChannel(guildId, textChannelId, queueLimitEmbed(result, settings));
      return result;
    }
    await updateVoiceChannel(guildId, parsedVoiceChannel);

    if (!activePlayerGuild) {
      await songPlayer(guildId);
    } else if (!isComingFromPlaylist) {
      await sendEmbed(guildId, false, false);
    }
    return 'queued';
  } catch (error) {
    if (error instanceof PreviewOnlyError) {
      // Expected, not a bug. A playlist counts it in its skipped songs instead of one message per track
      if (!isComingFromPlaylist) await sendErrorEmbed(guildId, textChannelId, error.message);
      return 'error';
    }
    captureError(error, { guildId, url, step: 'songRequest' });
    await sendErrorEmbed(guildId, textChannelId, String(error));
    return 'error';
  }
};
