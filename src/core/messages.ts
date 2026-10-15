import type { EmbedBuilder, TextChannel, User } from 'discord.js';
import { client } from 'src/Bot';
import { captureMessage } from 'src/config/monitoring';
import { type MessageKind, resolveMessageChannel } from 'src/config/settings';
import { getGuildSettings } from 'src/core/settings';
import { getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { unknownError } from 'src/utils/embeds/errorsEmbed';
import { playlistEmbed } from 'src/utils/embeds/listSongEmbed';
import { addSongEmbed, newSongEmbed } from 'src/utils/embeds/songEmbed';
import type { PlaylistInfo, songInterface } from 'src/utils/interfaces';

export const sendEmbed = async (
  guildId: string,
  isQueueStart: boolean = true,
  isComingFromListener: boolean = true
) => {
  const nextSongs = await getFirstSong(guildId);
  const isSongFirst = nextSongs.isQueueStart;
  if (isQueueStart && isComingFromListener && isSongFirst) {
    const currentSong: songInterface = nextSongs;

    if (!currentSong) return;
    if (currentSong.isComingFromPlaylist) return;

    return await sendBotMessage(guildId, currentSong.requestChannel, newSongEmbed(currentSong), 'announce');
  } else if (!isComingFromListener) {
    const currentSong: songInterface[] = await getNextSongs(guildId);
    const askedSong = currentSong[currentSong.length - 1];

    if (!askedSong) return;
    if (askedSong.isComingFromPlaylist) return;

    return await sendBotMessage(guildId, askedSong.requestChannel, addSongEmbed(askedSong), 'announce');
  }
};

export const sendQueueEmbed = async (
  guildId: string,
  playlistData: PlaylistInfo,
  textChannelId: string,
  author: User
) => sendBotMessage(guildId, textChannelId, await playlistEmbed(author, playlistData), 'announce');

export const sendEmbedToChannel = async (guildId: string, textChannelId: string, embed: EmbedBuilder) => {
  let guild: Awaited<ReturnType<typeof client.guilds.fetch>>;
  try {
    guild = await client.guilds.fetch(guildId);
  } catch (e) {
    console.error(`[messages] failed to fetch guild ${guildId}:`, e);
    return;
  }
  const messageChannel =
    (guild.channels.cache.get(textChannelId) as TextChannel | undefined) ??
    ((await guild.channels.fetch(textChannelId).catch(() => null)) as TextChannel | null);

  if (!messageChannel) {
    console.error(`[messages] channel ${textChannelId} not found in guild ${guildId}`);
    return;
  }

  return await messageChannel.send({ embeds: [embed] });
};

const trySend = (guildId: string, textChannelId: string, embed: EmbedBuilder) =>
  sendEmbedToChannel(guildId, textChannelId, embed).catch((e: unknown) => {
    console.error(`[messages] failed to send in channel ${textChannelId} of guild ${guildId}:`, e);
    return undefined;
  });

/**
 * Sends a bot message where the guild settings want it (see resolveMessageChannel).
 * When the reply channel is gone or not writable, answers in the command channel instead.
 */
export const sendBotMessage = async (
  guildId: string,
  commandChannelId: string,
  embed: EmbedBuilder,
  kind: MessageKind
) => {
  const target = resolveMessageChannel(await getGuildSettings(guildId), commandChannelId, kind);
  if (!target) return;

  const sent = await trySend(guildId, target, embed);
  if (sent || target === commandChannelId) return sent;

  captureMessage(
    'Reply channel unavailable, answering in the command channel',
    { guildId, replyChannelId: target },
    'warning'
  );
  return trySend(guildId, commandChannelId, embed);
};

export const sendErrorEmbed = (guildId: string, textChannelId: string, errorMsg: string) =>
  sendEmbedToChannel(guildId, textChannelId, unknownError(errorMsg));
