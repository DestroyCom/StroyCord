import { CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { client } from 'src/Bot';
import i18n from 'src/config/i18n';
import { fetchGuild } from 'src/database/queries/guilds/get';

import { playCommand } from '../textCommands';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Request a song !')
  .addStringOption((option) => option.setName('query').setDescription('The search or youtube url !').setRequired(true));

export async function execute(interaction: CommandInteraction) {
  const guild = await fetchGuild(interaction.guildId!);

  const channel = client.channels.cache.get(interaction.channelId!);
  if (!(channel instanceof TextChannel))
    return interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t(
        'embedsText.errors.arguments.textChannelNotFound'
      )} !`
    );

  const textChannel = channel as TextChannel;
  //@ts-expect-error : voiceChannel is not a property of interaction.member
  const voiceChannel = interaction.member.voice.channel;
  //@ts-expect-error : getString is not a property of interaction.options
  const query = interaction.options.getString('query');

  if (!guild)
    return interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.guildNotFound')} !`
    );
  if (!voiceChannel)
    return interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t(
        'embedsText.errors.arguments.voiceChannelNotFound'
      )} !`
    );
  if (!textChannel)
    return interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t(
        'embedsText.errors.arguments.textChannelNotFound'
      )} !`
    );
  if (!query)
    return interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.queryNotFound')} !`
    );

  await playCommand(['play', query], guild.guildId, textChannel, interaction.user, voiceChannel);
  interaction.reply(`${i18n.t('global.understood')} !`);
  interaction.deleteReply();
  return;
}
