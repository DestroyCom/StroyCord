import {
  type ChatInputCommandInteraction,
  type Client,
  Events,
  type Interaction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { commands } from 'src/commands/slashCommands';
import { handleConfigInteraction } from 'src/commands/slashCommands/config';
import { handleStatsInteraction } from 'src/commands/slashCommands/stats';
import { runWithSettings } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { captureError } from 'src/config/monitoring';
import { type GuildSettings, isChannelAllowed, isMemberBlocked, isSlashCommandEnabled } from 'src/config/settings';
import { getGuildSettings } from 'src/core/settings';
import { unknownError } from 'src/utils/embeds/errorsEmbed';

// Commands that ignore the channel restriction: an admin must always be able to fix the config
const UNRESTRICTED_COMMANDS = new Set(['config']);

// A cached member exposes a role manager, an uncached one (raw API data) a list of role ids
const memberRoleIds = (interaction: Interaction<'cached' | 'raw'>): string[] => {
  const roles = interaction.member.roles;
  return Array.isArray(roles) ? roles : [...roles.cache.keys()];
};

const isAdminConfigInteraction = (interaction: Interaction<'cached' | 'raw'>) => {
  const isConfig = interaction.isChatInputCommand()
    ? interaction.commandName === 'config'
    : 'customId' in interaction && interaction.customId.startsWith('cfg:');
  return isConfig && !!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
};

const handleChatInput = async (interaction: ChatInputCommandInteraction<'cached' | 'raw'>, settings: GuildSettings) => {
  const { commandName } = interaction;
  const command = commands[commandName as keyof typeof commands];
  if (!command) return;

  // Text mode removes these commands on redeploy, but a Discord client may still show them for a while
  if (!isSlashCommandEnabled(settings, commandName)) {
    await interaction.reply({
      content: i18n.t('commandMode.slashDisabled', { prefix: settings.prefix }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

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
  const embeds = [unknownError(`\`${label}\` failed: ${String(error)}`)];
  // Components belong to ephemeral panels: keep the error private too
  const flags = interaction.isChatInputCommand() ? undefined : MessageFlags.Ephemeral;
  const send = interaction.deferred
    ? interaction.editReply({ embeds })
    : interaction.replied
      ? interaction.followUp({ embeds, flags })
      : interaction.reply({ embeds, flags });
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
      // Blocked members get no answer at all, except admins on /config: they must be able to undo the block
      if (isMemberBlocked(settings, memberRoleIds(interaction)) && !isAdminConfigInteraction(interaction)) return;
      await runWithSettings(settings, async () => {
        if (interaction.isChatInputCommand()) await handleChatInput(interaction, settings);
        else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
          // Components are routed by customId prefix, without collectors: panels keep working after a restart
          if (interaction.customId.startsWith('cfg:')) await handleConfigInteraction(interaction);
          else if (interaction.customId.startsWith('stats:') && interaction.isButton()) {
            await handleStatsInteraction(interaction);
          }
        }
      });
    } catch (error) {
      console.error(`[interaction] ${label} failed:`, error);
      captureError(error, { guildId: interaction.guildId, command: label });
      await replyWithError(interaction, label, error);
    }
  });
};
