import { CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { client } from 'src/Bot';
import { fetchGuild } from 'src/database/queries/guilds/get';

import { queueCommand } from '../textCommands';

export const data = new SlashCommandBuilder().setName('queue').setDescription('Get the queue !');

export async function execute(interaction: CommandInteraction) {
  const guild = await fetchGuild(interaction.guildId!);

  const channel = client.channels.cache.get(interaction.channelId!);
  if (!(channel instanceof TextChannel)) return interaction.reply('Error: Text channel not found !');

  const textChannel = channel as TextChannel;
  //@ts-expect-error : voiceChannel is not a property of interaction.member
  const voiceChannel = interaction.member.voice.channel;

  if (!guild) return interaction.reply('Error: Guild not found !');
  if (!voiceChannel) return interaction.reply('Error: You must be in a voice channel !');
  if (!textChannel) return interaction.reply('Error: Text channel not found !');

  await queueCommand(guild.guildId, textChannel, interaction.user, voiceChannel);
  interaction.reply('Understood !');
  interaction.deleteReply();
  return;
}
