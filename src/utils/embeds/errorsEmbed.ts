import { EmbedBuilder } from 'discord.js';
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
    .setColor('#181818')
    .setTimestamp();
};

export const noMusicCurrentlyPlayingEmbed = (): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.noMusicPlaying.title')} !`)
    .setDescription(
      `${i18n.t('embedsText.global.youCanUse')} ${secrets.PREFIX}` +
        '`p [args]`' +
        `${i18n.t('embedsText.global.toLaunchANewMusic')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#181818')
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
    .setColor('#181818')
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
    .setColor('#181818')
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
        value: `${secrets.PREFIX}p [url/${i18n.t('global.search')}]`,
        inline: true,
      },
      {
        name: 'skip',
        value: `${secrets.PREFIX}s`,
        inline: true,
      },
      {
        name: 'stop',
        value: `${secrets.PREFIX}fo`,
        inline: true,
      },
      {
        name: 'pause',
        value: `${secrets.PREFIX}pa`,
        inline: true,
      },
      {
        name: 'resume',
        value: `${secrets.PREFIX}re`,
        inline: true,
      },
      {
        name: 'queue',
        value: `${secrets.PREFIX}q`,
        inline: true,
      }
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#181818')
    .setTimestamp();
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const unknownError = (errorMsg: any): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(`⚠️ ${i18n.t('embedsText.errors.unknown.title').toUpperCase()} !`)
    .setDescription(errorMsg)
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#181818')
    .setTimestamp();
};
