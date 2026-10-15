import { EmbedBuilder, type User } from 'discord.js';
import { getPrefix } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import { getFirstSong, getLastPlayedSong } from 'src/database/queries/guilds/get';

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
