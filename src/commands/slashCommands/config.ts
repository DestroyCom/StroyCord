import {
  type ChatInputCommandInteraction,
  InteractionContextType,
  type MessageComponentInteraction,
  MessageFlags,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { runWithSettings } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { nextCommandMode, parseLimit, parsePrefix, resolveSettings, type StoredSettings } from 'src/config/settings';
import { getStoredSettings, resetGuildSettings, updateGuildSettings } from 'src/core/settings';
import { deletePlays } from 'src/database/queries/plays';
import { deployCommands } from 'src/deploy-commands';
import {
  blockedRolesModal,
  CONFIG_IDS,
  CONFIG_MODAL_FIELDS,
  configConfirmation,
  configModal,
  configPanel,
  parseLanguageValue,
} from 'src/utils/embeds/configEmbed';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure the bot for this server (admins only)')
  .setDescriptionLocalizations({ fr: 'Configurer le bot pour ce serveur (admins uniquement)' })
  // Hidden from members without "Manage Server" (server admins can adjust this in Integrations)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

type ConfigInteraction = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;

// The command visibility is only a client-side default: check the permission on every interaction
const ensureAdmin = async (interaction: ConfigInteraction) => {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  await interaction.reply({ content: i18n.t('config.errors.forbidden'), flags: MessageFlags.Ephemeral });
  return false;
};

/** Renders the panel in the guild's (possibly just changed) language */
const renderPanel = async (interaction: ConfigInteraction, stored?: StoredSettings, noticeKey?: string) => {
  const guildId = interaction.guildId as string;
  const current = stored ?? (await getStoredSettings(guildId));
  const existingChannelIds = interaction.guild ? new Set(interaction.guild.channels.cache.keys()) : undefined;
  return runWithSettings(resolveSettings(current), () =>
    configPanel(current, existingChannelIds, noticeKey ? `✅ ${i18n.t(noticeKey)}` : undefined)
  );
};

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await ensureAdmin(interaction))) return;
  await interaction.reply({ ...(await renderPanel(interaction)), flags: MessageFlags.Ephemeral });
}

const update = (interaction: ConfigInteraction, patch: Partial<StoredSettings>) =>
  updateGuildSettings(interaction.guildId as string, patch, interaction.user.id);

/** A modal opened from the panel refreshes it in place */
const showSavedPanel = async (interaction: ModalSubmitInteraction, stored: StoredSettings) => {
  const panel = await renderPanel(interaction, stored, 'config.notices.saved');
  if (interaction.isFromMessage()) await interaction.update(panel);
  else await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
};

const handleModalSubmit = async (interaction: ModalSubmitInteraction) => {
  const prefix = parsePrefix(interaction.fields.getTextInputValue(CONFIG_MODAL_FIELDS.prefix));
  const maxQueueSize = parseLimit(interaction.fields.getTextInputValue(CONFIG_MODAL_FIELDS.maxQueueSize), 1, null);
  const maxSongsPerUser = parseLimit(interaction.fields.getTextInputValue(CONFIG_MODAL_FIELDS.maxSongsPerUser), 0, 0);

  const errors = [prefix, maxQueueSize, maxSongsPerUser].flatMap((result) => (result.ok ? [] : [i18n.t(result.error)]));
  if (!prefix.ok || !maxQueueSize.ok || !maxSongsPerUser.ok) {
    await interaction.reply({
      content: [...new Set(errors)].map((error) => `⚠️ ${error}`).join('\n'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const stored = await update(interaction, {
    prefix: prefix.value,
    maxQueueSize: maxQueueSize.value,
    maxSongsPerUser: maxSongsPerUser.value,
  });
  await showSavedPanel(interaction, stored);
};

const handleBlockedRolesSubmit = async (interaction: ModalSubmitInteraction) => {
  // null when nothing is selected
  const roles = interaction.fields.getSelectedRoles(CONFIG_MODAL_FIELDS.blockedRoles);
  const stored = await update(interaction, { blockedRoleIds: [...(roles?.keys() ?? [])] });
  await showSavedPanel(interaction, stored);
};

const handleComponent = async (interaction: MessageComponentInteraction) => {
  const guildId = interaction.guildId as string;

  switch (interaction.customId) {
    case CONFIG_IDS.language: {
      if (!interaction.isStringSelectMenu()) return;
      const stored = await update(interaction, { language: parseLanguageValue(interaction.values[0] ?? '') });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.channels: {
      if (!interaction.isChannelSelectMenu()) return;
      const stored = await update(interaction, { commandChannelIds: interaction.values });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.toggleDetect: {
      const current = resolveSettings(await getStoredSettings(guildId));
      const stored = await update(interaction, { detectFromAllMessages: !current.detectFromAllMessages });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.toggleStats: {
      const current = await getStoredSettings(guildId);
      const stored = await update(interaction, { statsEnabled: !current.statsEnabled });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.replyChannel: {
      if (!interaction.isChannelSelectMenu()) return;
      const stored = await update(interaction, { replyChannelId: interaction.values[0] ?? null });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.toggleReplies: {
      const current = await getStoredSettings(guildId);
      const stored = await update(interaction, { replyMessagesEnabled: !current.replyMessagesEnabled });
      return interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
    }
    case CONFIG_IDS.cycleCommandMode: {
      const current = await getStoredSettings(guildId);
      const stored = await update(interaction, { commandMode: nextCommandMode(current.commandMode) });
      // Answer first: the interaction must be acknowledged within 3 s, the redeploy may take longer
      await interaction.update(await renderPanel(interaction, stored, 'config.notices.saved'));
      return deployCommands({ guildId });
    }
    case CONFIG_IDS.edit:
      return interaction.showModal(configModal(await getStoredSettings(guildId)));
    case CONFIG_IDS.blockedRoles:
      return interaction.showModal(blockedRolesModal(await getStoredSettings(guildId)));
    case CONFIG_IDS.resetSettings:
      return interaction.update(configConfirmation('settings'));
    case CONFIG_IDS.resetStats:
      return interaction.update(configConfirmation('stats'));
    case CONFIG_IDS.confirmResetSettings: {
      const stored = await resetGuildSettings(guildId, interaction.user.id);
      await interaction.update(await renderPanel(interaction, stored, 'config.notices.settingsReset'));
      // The command mode is back to 'both'
      return deployCommands({ guildId });
    }
    case CONFIG_IDS.confirmResetStats:
      await deletePlays([guildId]);
      return interaction.update(await renderPanel(interaction, undefined, 'config.notices.statsReset'));
    case CONFIG_IDS.cancel:
      return interaction.update(await renderPanel(interaction));
  }
};

/** Entry point for every `cfg:` component and modal (see CONFIG_IDS) */
export async function handleConfigInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
  if (!(await ensureAdmin(interaction))) return;
  if (interaction.isModalSubmit()) {
    if (interaction.customId === CONFIG_IDS.modal) await handleModalSubmit(interaction);
    else if (interaction.customId === CONFIG_IDS.blockedRolesModal) await handleBlockedRolesSubmit(interaction);
    return;
  }
  await handleComponent(interaction);
}
