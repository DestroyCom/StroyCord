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
  .addIntegerOption((option) =>
    option
      .setName('position')
      .setDescription('The song to move up (its position in the queue)')
      .setDescriptionLocalizations({ fr: 'Le titre à passer en priorité (sa position dans la file)' })
      .setMinValue(1)
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.guildId) return interaction.respond([]);
  const typed = String(interaction.options.getFocused()).toLowerCase();
  const waiting = (await getNextSongs(interaction.guildId)) as songInterface[];
  await interaction.respond(
    waiting
      .map((song, index) => ({ song, position: index + 1 }))
      .filter(({ song, position }) => String(position) === typed || song.title.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(({ song, position }) => ({
        name: `${position}. ${song.title} — ${song.requestAuthor.username}`.slice(0, 100),
        value: position,
      }))
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = client.channels.cache.get(interaction.channelId);
  const voiceChannel = (interaction.member as GuildMember | null)?.voice?.channel;
  if (!interaction.guildId || !(channel instanceof TextChannel)) {
    await interaction.reply(
      `${i18n.t('embedsText.errors.arguments.unknown.title')} ${i18n.t('embedsText.errors.arguments.textChannelNotFound')} !`
    );
    return;
  }

  await priorityCommand(
    interaction.guildId,
    channel,
    interaction.user,
    voiceChannel,
    String(interaction.options.getInteger('position', true))
  );
  await interaction.reply(`${i18n.t('global.understood')} !`);
  await interaction.deleteReply();
}
