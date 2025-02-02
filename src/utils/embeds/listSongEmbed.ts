import ytpl from '@distube/ytpl';
import { EmbedBuilder, User } from 'discord.js';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';

import { songInterface } from '../interfaces';

export const queueEmbed = async (nextSongs: songInterface[]): Promise<EmbedBuilder> => {
  if (nextSongs.length === 0)
    return new EmbedBuilder()
      .setTitle(`🤔 ${i18n.t('embedsText.lists.emptyQueue.title')}...`)
      .setDescription(
        `${i18n.t('embedsText.global.youCanUse')} ${secrets.PREFIX}` +
          '`p [args]`' +
          `${i18n.t('embedsText.global.toLaunchANewMusic')} !`
      )
      .setAuthor({
        name: 'Stroycord',
        iconURL: secrets.STROYCORD_LOGO,
      })
      .setColor('#37123C')
      .setTimestamp();

  const tabEmbeds: { name: string; value: string }[] = [];

  nextSongs.forEach((song, index) => {
    if (index > 10) {
      return;
    } else if (index === 10) {
      tabEmbeds.push({
        name: '...',
        value: '\u200B',
      });
    } else {
      tabEmbeds.push({
        name: `${index + 1} - ${song.title}`,
        value: `${song.videoAuthor}, ${song.videoLength} minutes.`,
      });
    }
  });

  return new EmbedBuilder()
    .setTitle(
      `${i18n.t('embedsText.global.youHave')} ` + nextSongs.length + ` ${i18n.t('embedsText.lists.queue.title')} !`
    )
    .setAuthor({
      name: 'Stroycord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setColor('#37123C')
    .setFooter({
      text: 'StroyCord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setTimestamp()
    .addFields(tabEmbeds);
};

export const playlistEmbed = async (author: User, playlistData: ytpl.result): Promise<EmbedBuilder> => {
  const msg = new EmbedBuilder()
    .setTitle(`${author.username} ${i18n.t('embedsText.lists.playlist.title')} !`)
    .setAuthor({
      name: 'Stroycord',
      iconURL: author.avatarURL() || '',
    })
    .setColor('#C4302B')
    .setFooter({
      text: 'StroyCord',
      iconURL: secrets.STROYCORD_LOGO,
    })
    .setTimestamp()
    .setURL(playlistData.url || 'https://www.youtube.com/')
    .addFields(
      {
        name: `${i18n.t('embedsText.global.findWith')} :`,
        value: `${secrets.PREFIX}p ${playlistData.url}`,
      },
      {
        name: `${i18n.t('embedsText.lists.playlist.fields.playListName')} :`,
        value: playlistData.title || 'No title',
        inline: true,
      },
      {
        name: `${i18n.t('embedsText.lists.playlist.fields.playlistCreatedBy')} :`,
        value: (playlistData.author && playlistData.author.name) || 'No name',
        inline: true,
      },
      {
        name: `${i18n.t('embedsText.lists.playlist.fields.putInQueue')} :`,
        value:
          (playlistData.items.length > 30 ? 30 : playlistData.items.length) + `${i18n.t('embedsText.global.musics')}`,
      }
    );

  if (playlistData.items.length > 0 && playlistData.items[0].thumbnail) {
    msg.setThumbnail(playlistData.items[0].thumbnail);
  }

  return msg;
};
