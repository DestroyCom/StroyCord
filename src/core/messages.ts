//import ytpl from '@distube/ytpl';
import { TextChannel, User } from 'discord.js';
import { client } from 'src/Bot';
import { getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { playlistEmbed } from 'src/utils/embeds/listSongEmbed';
import { addSongEmbed, newSongEmbed } from 'src/utils/embeds/songEmbed';
import { songInterface } from 'src/utils/interfaces';

import { YtbPlaylistResult } from './youtubeJs/playlistGetter';

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

    const messageChannel = await client.guilds
      .fetch(guildId)
      .then((guild) => guild.channels.cache.get(currentSong.requestChannel));

    const embed = newSongEmbed(currentSong);

    return await (messageChannel as TextChannel)?.send({
      embeds: [embed],
    });
  } else if (!isComingFromListener) {
    const currentSong: songInterface[] = await getNextSongs(guildId);
    const askedSong = currentSong[currentSong.length - 1];

    if (!askedSong) return;
    if (askedSong.isComingFromPlaylist) return;

    const messageChannel = await client.guilds
      .fetch(guildId)
      .then((guild) => guild.channels.cache.get(askedSong.requestChannel));

    const embed = addSongEmbed(askedSong);

    return await (messageChannel as TextChannel)?.send({
      embeds: [embed],
    });
  }
};

export const sendQueueEmbed = async (
  guildId: string,
  playlistData: YtbPlaylistResult,
  textChannelId: string,
  author: User
) => {
  const messageChannel = await client.guilds.fetch(guildId).then((guild) => guild.channels.cache.get(textChannelId));

  const embed = await playlistEmbed(author, playlistData);

  return await (messageChannel as TextChannel)?.send({
    embeds: [embed],
  });
};
