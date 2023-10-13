import { CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { client } from 'src/Bot';
import { fetchGuild } from 'src/database/queries/guilds/get';

import { playCommand } from '../textCommands';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Request a song !')
  .addStringOption((option) => option.setName('query').setDescription('The search or youtube url !').setRequired(true));

export async function execute(interaction: CommandInteraction) {
  const guild = await fetchGuild(interaction.guildId!);

  const channel = client.channels.cache.get(interaction.channelId!);
  if (!(channel instanceof TextChannel)) return interaction.reply('Error: Text channel not found !');

  const textChannel = channel as TextChannel;
  //@ts-expect-error : voiceChannel is not a property of interaction.member
  const voiceChannel = interaction.member.voice.channel;
  //@ts-expect-error : getString is not a property of interaction.options
  const query = interaction.options.getString('query');

  if (!guild) return interaction.reply('Error: Guild not found !');
  if (!voiceChannel) return interaction.reply('Error: You must be in a voice channel !');
  if (!textChannel) return interaction.reply('Error: Text channel not found !');
  if (!query) return interaction.reply('Error: You must provide a query !');

  await playCommand(['play', query], guild.guildId, textChannel, interaction.user, voiceChannel);
  interaction.reply('Song requested !');
  interaction.deleteReply();
  return;
}
