import { type ChatInputCommandInteraction, type Client, Events, type Interaction, MessageFlags } from 'discord.js';
import { commands } from 'src/commands/slashCommands';
import { runWithSettings } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { captureError } from 'src/config/monitoring';
import { type GuildSettings, isChannelAllowed } from 'src/config/settings';
import { getGuildSettings } from 'src/core/settings';
import { unknownError } from 'src/utils/embeds/errorsEmbed';

// Commands that ignore the channel restriction: an admin must always be able to fix the config
const UNRESTRICTED_COMMANDS = new Set(['config']);

const handleChatInput = async (interaction: ChatInputCommandInteraction<'cached' | 'raw'>, settings: GuildSettings) => {
  const { commandName } = interaction;
  const command = commands[commandName as keyof typeof commands];
  if (!command) return;

  const parentId = interaction.channel && 'parentId' in interaction.channel ? interaction.channel.parentId : null;
  if (!UNRESTRICTED_COMMANDS.has(commandName) && !isChannelAllowed(settings, interaction.channelId, parentId)) {
    const channels = settings.commandChannelIds.map((id) => `<#${id}>`).join(', ');
    await interaction.reply({
      content: `${i18n.t('channels.notAllowed')} ${channels}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await command.execute(interaction);
};

const replyWithError = async (interaction: Interaction, label: string, error: unknown) => {
  if (!interaction.isRepliable()) return;
  // Tell the user instead of leaving the interaction unanswered ("The application did not respond")
  const response = { embeds: [unknownError(`\`${label}\` failed: ${String(error)}`)] };
  const send = interaction.deferred
    ? interaction.editReply(response)
    : interaction.replied
      ? interaction.followUp(response)
      : interaction.reply(response);
  await send.catch((e: unknown) => console.error(`[interaction] ${label} error reply failed:`, e));
};

export default (client: Client): void => {
  client.on(Events.InteractionCreate, async (interaction) => {
    // Every command is guild-scoped (deployed per guild)
    if (!interaction.inGuild()) return;
    const label = interaction.isChatInputCommand()
      ? `/${interaction.commandName}`
      : 'customId' in interaction
        ? interaction.customId
        : interaction.type.toString();

    try {
      const settings = await getGuildSettings(interaction.guildId);
      await runWithSettings(settings, async () => {
        if (interaction.isChatInputCommand()) await handleChatInput(interaction, settings);
      });
    } catch (error) {
      console.error(`[interaction] ${label} failed:`, error);
      captureError(error, { guildId: interaction.guildId, command: label });
      await replyWithError(interaction, label, error);
    }
  });
};
