import { EmbedBuilder, escapeMarkdown, type User } from 'discord.js';
import { getPrefix } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import { getFirstSong, getLastPlayedSong, type QueuedPlaylistSummary } from 'src/database/queries/guilds/get';

import type { songInterface } from '../interfaces';

const stroyCordLogo = secrets.STROYCORD_LOGO;

export const pauseEmbed = (author: User) => {
  return new EmbedBuilder()
    .setTitle(`⏸ ${author.username} ${i18n.t('embedsText.player.pause.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${getPrefix()}` +
        '`re` ' +
        `${i18n.t('embedsText.player.pause.description')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: stroyCordLogo,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const resumeEmbed = (author: User) => {
  return new EmbedBuilder()
    .setTitle(`▶ ${author.username} ${i18n.t('embedsText.player.resume.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${getPrefix()}` +
        '`pa` ' +
        `${i18n.t('embedsText.player.resume.description')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: stroyCordLogo,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const skipEmbed = async (author: User, guildId: string) => {
  const nextSong: songInterface = await getFirstSong(guildId);
  const lastSong: songInterface = await getLastPlayedSong(guildId);

  return new EmbedBuilder()
    .setTitle(`⏭ ${author.username} ${i18n.t('embedsText.player.skip.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${getPrefix()}` +
        '`fo` ' +
        `${i18n.t('embedsText.player.skip.description')} !`
    )
    .addFields(
      {
        name: `${i18n.t('embedsText.player.skip.fields.nowPlaying')} :`,
        value: `${nextSong.title} - ${nextSong.videoAuthor}`,
        inline: true,
      },
      {
        name: `${i18n.t('embedsText.global.duration')} :`,
        value: nextSong.videoLength,
        inline: true,
      },
      {
        name: `${i18n.t('embedsText.player.skip.fields.previouslyPlayed')} :`,
        value: `${lastSong.title} - ${lastSong.videoAuthor}`,
      }
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: stroyCordLogo,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const removeEmbed = (author: User) => {
  return new EmbedBuilder()
    .setTitle(`❌ ${author.username} ${i18n.t('embedsText.player.remove.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${getPrefix()}` +
        '`p [args]`' +
        `${i18n.t('embedsText.global.toLaunchANewMusic')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: stroyCordLogo,
    })
    .setColor('#37123C')
    .setTimestamp();
};

const queueToolEmbed = (title: string, description: string) =>
  new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setAuthor({
      name: 'Stroycord',
      iconURL: stroyCordLogo,
    })
    .setColor('#37123C')
    .setTimestamp();

export const playlistClearedEmbed = (author: User, playlist: QueuedPlaylistSummary, removed: number) =>
  queueToolEmbed(
    `🧹 ${i18n.t('queueTools.playlistCleared.title', { username: author.username })} !`,
    i18n.t('queueTools.playlistCleared.description', { title: escapeMarkdown(playlist.title), count: removed })
  );

export const choosePlaylistEmbed = (playlists: QueuedPlaylistSummary[]) =>
  queueToolEmbed(
    `📃 ${i18n.t('queueTools.choosePlaylist.title')}`,
    `${i18n.t('queueTools.choosePlaylist.description', { command: `\`${getPrefix()}cp <n>\`` })} :\n\n${playlists
      .map(
        (playlist, index) =>
          `**${index + 1}.** ${escapeMarkdown(playlist.title)} — ${i18n.t('queueTools.playlistLine', {
            count: playlist.count,
            username: escapeMarkdown(playlist.requestedBy),
          })}`
      )
      .join('\n')}`
  );

export const prioritizedEmbed = (author: User, song: songInterface) =>
  queueToolEmbed(
    `⏫ ${i18n.t('queueTools.prioritized.title', { username: author.username })} !`,
    i18n.t('queueTools.prioritized.description', { title: escapeMarkdown(song.title) })
  );
