import { type CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { client } from 'src/Bot';
import i18n from 'src/config/i18n';
import { fetchGuild } from 'src/database/queries/guilds/get';

import { playCommand } from '../textCommands';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Request a song !')
  .addStringOption((option) => option.setName('query').setDescription('The search or youtube url !').setRequired(true));

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const guild = await fetchGuild(interaction.guildId!);

  const channel = client.channels.cache.get(interaction.channelId!);
  if (!(channel instanceof TextChannel)) {
    await interaction.editReply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t(
        'embedsText.errors.arguments.textChannelNotFound'
      )} !`
    );
    return;
  }

  const textChannel = channel as TextChannel;
  //@ts-expect-error : voiceChannel is not a property of interaction.member
  const voiceChannel = interaction.member.voice.channel;
  //@ts-expect-error : getString is not a property of interaction.options
  const query = interaction.options.getString('query');

  if (!guild) {
    await interaction.editReply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.guildNotFound')} !`
    );
    return;
  }
  if (!voiceChannel) {
    await interaction.editReply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t(
        'embedsText.errors.arguments.voiceChannelNotFound'
      )} !`
    );
    return;
  }
  if (!query) {
    await interaction.editReply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.queryNotFound')} !`
    );
    return;
  }

  await playCommand(['play', query], guild.guildId, textChannel, interaction.user, voiceChannel);
  await interaction.deleteReply();
}
