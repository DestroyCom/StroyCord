import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { client } from 'src/Bot';
import i18n from 'src/config/i18n';
import { getQueuedPlaylists } from 'src/database/queries/guilds/get';

import { clearPlaylistCommand } from '../textCommands';

export const data = new SlashCommandBuilder()
  .setName('clearplaylist')
  .setDescription('Remove the waiting songs of a playlist (the song playing continues) !')
  .setDescriptionLocalizations({ fr: "Retire les titres en attente d'une playlist (le titre en cours continue) !" })
  .addStringOption((option) =>
    option
      .setName('playlist')
      .setDescription('The playlist to remove (optional when only one is waiting)')
      .setDescriptionLocalizations({ fr: 'La playlist à retirer (facultatif si une seule est en attente)' })
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.guildId) return interaction.respond([]);
  const typed = interaction.options.getFocused().toLowerCase();
  const playlists = await getQueuedPlaylists(interaction.guildId);
  await interaction.respond(
    playlists
      .filter((playlist) => playlist.title.toLowerCase().includes(typed))
      .slice(0, 25)
      .map((playlist) => ({
        name: `${playlist.title} — ${i18n.t('queueTools.playlistLine', {
          count: playlist.count,
          username: playlist.requestedBy,
        })}`.slice(0, 100),
        value: playlist.id,
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

  await clearPlaylistCommand(
    interaction.guildId,
    channel,
    interaction.user,
    voiceChannel,
    interaction.options.getString('playlist') ?? undefined
  );
  await interaction.reply(`${i18n.t('global.understood')} !`);
  await interaction.deleteReply();
}
