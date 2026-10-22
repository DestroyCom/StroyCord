import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { client } from 'src/Bot';
import i18n from 'src/config/i18n';
import { getNextSongs } from 'src/database/queries/guilds/get';
import type { songInterface } from 'src/utils/interfaces';

import { priorityCommand } from '../textCommands';

export const data = new SlashCommandBuilder()
  .setName('priority')
  .setDescription('Play a song of the queue right after the current one !')
  .setDescriptionLocalizations({ fr: 'Joue un titre de la file juste après celui en cours !' })
  // A string option: the autocomplete value is the song's queueId (an integer option could only carry its position,
  // which points to another song once the current one ends). A typed number still works as a position.
  .addStringOption((option) =>
    option
      .setName('song')
      .setDescription('The song to move up (pick it, or type its position in the queue)')
      .setDescriptionLocalizations({ fr: 'Le titre à passer en priorité (choisissez-le, ou tapez sa position)' })
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.guildId) return interaction.respond([]);
  const typed = interaction.options.getFocused().toLowerCase();
  const waiting = (await getNextSongs(interaction.guildId)) as songInterface[];
  await interaction.respond(
    waiting
      .map((song, index) => ({ song, position: index + 1 }))
      .filter(({ song, position }) => String(position) === typed || song.title.toLowerCase().includes(typed))
      .slice(0, 25)
      .filter(({ song }) => !!song.queueId)
      .map(({ song, position }) => ({
        name: `${position}. ${song.title} — ${song.requestAuthor.username}`.slice(0, 100),
        value: song.queueId as string,
      }))
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  // Acknowledge first: Discord drops an interaction not answered within 3 s, the queue edit could take longer
  await interaction.deferReply();
  const channel = client.channels.cache.get(interaction.channelId);
  const voiceChannel = (interaction.member as GuildMember | null)?.voice?.channel;
  if (!interaction.guildId || !(channel instanceof TextChannel)) {
    await interaction.editReply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.textChannelNotFound')} !`
    );
    return;
  }

  await priorityCommand(
    interaction.guildId,
    channel,
    interaction.user,
    voiceChannel,
    interaction.options.getString('song', true)
  );
  await interaction.deleteReply();
}
