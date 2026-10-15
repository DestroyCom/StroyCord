import { EmbedBuilder } from 'discord.js';
import { getPrefix } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';

export const noPresenceInVoiceChannelEmbed = (commandTried: string): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.authorPresence.title')} ${commandTried} !`)
    .setDescription(`${i18n.t('embedsText.errors.authorPresence.description')} !`)
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const noMusicCurrentlyPlayingEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.noMusicPlaying.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${getPrefix()}` +
        '`p [args]`' +
        `${i18n.t('embedsText.global.toLaunchANewMusic')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const missingRequiredArgument = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.arguments.missing.title')} !`)
    .setDescription(`${i18n.t('embedsText.errors.arguments.missing.description')} !`)
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const unreconizedArgumentEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.arguments.unknown.title')} !`)
    .setDescription(`${i18n.t('embedsText.errors.arguments.unknown.description')} !`)
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const unknownRequestEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.request.title')} !`)
    .setDescription(`${i18n.t('embedsText.errors.request.description')} !`)
    .addFields(
      {
        name: `${i18n.t('embedsText.errors.request.fields.usableCommands')} :`,
        value: '\u200B',
      },
      {
        name: 'play',
        value: `${getPrefix()}p [url/${i18n.t('global.search')}]`,
        inline: true,
      },
      {
        name: 'redo',
        value: `${getPrefix()}redo`,
        inline: true,
      },
      {
        name: 'skip',
        value: `${getPrefix()}s`,
        inline: true,
      },
      {
        name: 'stop',
        value: `${getPrefix()}fo`,
        inline: true,
      },
      {
        name: 'pause',
        value: `${getPrefix()}pa`,
        inline: true,
      },
      {
        name: 'resume',
        value: `${getPrefix()}re`,
        inline: true,
      },
      {
        name: 'queue',
        value: `${getPrefix()}q`,
        inline: true,
      },
      {
        name: 'current',
        value: `${getPrefix()}c`,
        inline: true,
      }
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};

export const unknownError = (errorMsg: string): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.unknown.title').toUpperCase()} !`)
    .setDescription(errorMsg)
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setTimestamp();
};
