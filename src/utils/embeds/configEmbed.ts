import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import {
  type GuildSettings,
  type Language,
  MAX_BLOCKED_ROLES,
  MAX_COMMAND_CHANNELS,
  QUEUE_LIMIT_CAP,
  resolveSettings,
  type StoredSettings,
  SUPPORTED_LANGUAGES,
} from 'src/config/settings';

// customIds of the /config panel, routed by the interaction listener (stateless: survives restarts)
export const CONFIG_IDS = {
  language: 'cfg:language',
  channels: 'cfg:channels',
  edit: 'cfg:edit',
  modal: 'cfg:modal',
  toggleDetect: 'cfg:toggle:detect',
  toggleStats: 'cfg:toggle:stats',
  replyChannel: 'cfg:replyChannel',
  toggleReplies: 'cfg:toggle:replies',
  cycleCommandMode: 'cfg:cycle:commandMode',
  blockedRoles: 'cfg:blockedRoles',
  blockedRolesModal: 'cfg:blockedRoles:modal',
  resetSettings: 'cfg:reset:settings',
  resetStats: 'cfg:reset:stats',
  confirmResetSettings: 'cfg:confirm:settings',
  confirmResetStats: 'cfg:confirm:stats',
  cancel: 'cfg:cancel',
} as const;

export const CONFIG_MODAL_FIELDS = {
  prefix: 'prefix',
  maxQueueSize: 'maxQueueSize',
  maxSongsPerUser: 'maxSongsPerUser',
  blockedRoles: 'blockedRoles',
} as const;

const DEFAULT_LANGUAGE_VALUE = 'default';

const LANGUAGE_NAMES: Record<Language, string> = {
  'en-US': 'English',
  'fr-FR': 'Français',
};

const ALLOWED_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice];

export const parseLanguageValue = (value: string): Language | null =>
  SUPPORTED_LANGUAGES.find((language) => language === value) ?? null;

const withDefaultMarker = (value: string, isDefault: boolean) =>
  isDefault ? `${value} *(${i18n.t('config.default')})*` : value;

const onOff = (enabled: boolean) => (enabled ? i18n.t('config.enabled') : i18n.t('config.disabled'));

const configEmbed = (stored: StoredSettings, settings: GuildSettings, notice?: string) => {
  const channels =
    settings.commandChannelIds.length === 0
      ? i18n.t('config.fields.allChannels')
      : settings.commandChannelIds.map((id) => `<#${id}>`).join(', ');

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ ${i18n.t('config.title')}`)
    .setDescription(i18n.t('config.description'))
    .addFields(
      {
        name: i18n.t('config.fields.prefix'),
        value: withDefaultMarker(`\`${settings.prefix}\``, stored.prefix === null),
        inline: true,
      },
      {
        name: i18n.t('config.fields.language'),
        value: withDefaultMarker(LANGUAGE_NAMES[settings.language], stored.language === null),
        inline: true,
      },
      {
        name: i18n.t('config.fields.detect'),
        value: withDefaultMarker(onOff(settings.detectFromAllMessages), stored.detectFromAllMessages === null),
        inline: true,
      },
      { name: i18n.t('config.fields.channels'), value: channels },
      {
        name: i18n.t('config.fields.maxQueueSize'),
        value: withDefaultMarker(String(settings.maxQueueSize), stored.maxQueueSize === null),
        inline: true,
      },
      {
        name: i18n.t('config.fields.maxSongsPerUser'),
        value: settings.maxSongsPerUser === 0 ? i18n.t('config.unlimited') : String(settings.maxSongsPerUser),
        inline: true,
      },
      { name: i18n.t('config.fields.stats'), value: onOff(settings.statsEnabled), inline: true },
      {
        name: i18n.t('config.fields.replyChannel'),
        value: settings.replyChannelId ? `<#${settings.replyChannelId}>` : i18n.t('config.fields.commandChannel'),
        inline: true,
      },
      { name: i18n.t('config.fields.replies'), value: onOff(settings.replyMessagesEnabled), inline: true },
      {
        name: i18n.t('config.fields.commandMode'),
        value: i18n.t(`config.commandModes.${settings.commandMode}`),
        inline: true,
      },
      {
        name: i18n.t('config.fields.blockedRoles'),
        value:
          settings.blockedRoleIds.length === 0
            ? i18n.t('config.fields.noBlockedRoles')
            : settings.blockedRoleIds.map((id) => `<@&${id}>`).join(', '),
      }
    )
    .setAuthor({ name: 'Stroycord', iconURL: secrets.STROYCORD_LOGO })
    .setColor('#37123C')
    .setTimestamp();

  if (notice) embed.setFooter({ text: notice });
  return embed;
};

/**
 * @param existingChannelIds channels still present in the guild: deleted ones can't be preselected in the menu
 */
export const configPanel = (stored: StoredSettings, existingChannelIds?: Set<string>, notice?: string) => {
  const settings = resolveSettings(stored);

  const language = new StringSelectMenuBuilder()
    .setCustomId(CONFIG_IDS.language)
    .setPlaceholder(i18n.t('config.fields.language'))
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${i18n.t('config.default')} (${LANGUAGE_NAMES[resolveSettings().language]})`)
        .setValue(DEFAULT_LANGUAGE_VALUE)
        .setDefault(stored.language === null),
      ...SUPPORTED_LANGUAGES.map((lang) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(LANGUAGE_NAMES[lang])
          .setValue(lang)
          .setDefault(stored.language === lang)
      )
    );

  const channels = new ChannelSelectMenuBuilder()
    .setCustomId(CONFIG_IDS.channels)
    .setPlaceholder(i18n.t('config.channelsPlaceholder'))
    .setChannelTypes(ALLOWED_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(MAX_COMMAND_CHANNELS);
  const preselected = settings.commandChannelIds.filter((id) => !existingChannelIds || existingChannelIds.has(id));
  if (preselected.length > 0) channels.setDefaultChannels(preselected);

  const replyChannel = new ChannelSelectMenuBuilder()
    .setCustomId(CONFIG_IDS.replyChannel)
    .setPlaceholder(i18n.t('config.replyChannelPlaceholder'))
    .setChannelTypes(ALLOWED_CHANNEL_TYPES)
    .setMinValues(0)
    .setMaxValues(1);
  if (settings.replyChannelId && (!existingChannelIds || existingChannelIds.has(settings.replyChannelId)))
    replyChannel.setDefaultChannels(settings.replyChannelId);

  const toggles = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.edit)
      .setLabel(i18n.t('config.buttons.edit'))
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.toggleDetect)
      .setLabel(i18n.t('config.buttons.detect'))
      .setStyle(settings.detectFromAllMessages ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.toggleStats)
      .setLabel(i18n.t('config.buttons.stats'))
      .setStyle(settings.statsEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.toggleReplies)
      .setLabel(i18n.t('config.buttons.replies'))
      .setStyle(settings.replyMessagesEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.cycleCommandMode)
      .setLabel(`${i18n.t('config.buttons.commandMode')} : ${i18n.t(`config.commandModes.${settings.commandMode}`)}`)
      .setStyle(ButtonStyle.Primary)
  );

  const resets = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.blockedRoles)
      .setLabel(i18n.t('config.buttons.blockedRoles'))
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.resetSettings)
      .setLabel(i18n.t('config.buttons.resetSettings'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CONFIG_IDS.resetStats)
      .setLabel(i18n.t('config.buttons.resetStats'))
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [configEmbed(stored, settings, notice)],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(language),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channels),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(replyChannel),
      toggles,
      resets,
    ],
  };
};

export const configConfirmation = (target: 'settings' | 'stats') => ({
  embeds: [
    new EmbedBuilder()
      .setTitle(`⚠️ ${i18n.t(`config.confirm.${target}.title`)}`)
      .setDescription(i18n.t(`config.confirm.${target}.description`))
      .setColor('#C4302B'),
  ],
  components: [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(target === 'settings' ? CONFIG_IDS.confirmResetSettings : CONFIG_IDS.confirmResetStats)
        .setLabel(i18n.t('config.buttons.confirm'))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CONFIG_IDS.cancel)
        .setLabel(i18n.t('config.buttons.cancel'))
        .setStyle(ButtonStyle.Secondary)
    ),
  ],
});

export const configModal = (stored: StoredSettings) => {
  const settings = resolveSettings(stored);
  const input = (customId: string, value: string, maxLength: number, placeholder: string) => {
    const text = new TextInputBuilder()
      .setCustomId(customId)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(maxLength)
      .setPlaceholder(placeholder);
    if (value) text.setValue(value);
    return text;
  };

  return new ModalBuilder()
    .setCustomId(CONFIG_IDS.modal)
    .setTitle(i18n.t('config.modal.title'))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(i18n.t('config.fields.prefix'))
        .setDescription(i18n.t('config.modal.prefixHint'))
        .setTextInputComponent(
          input(CONFIG_MODAL_FIELDS.prefix, stored.prefix ?? '', 5, `${i18n.t('config.default')} : ${secrets.PREFIX}`)
        ),
      new LabelBuilder()
        .setLabel(i18n.t('config.fields.maxQueueSize'))
        .setDescription(i18n.t('config.modal.maxQueueSizeHint', { max: QUEUE_LIMIT_CAP }))
        .setTextInputComponent(
          input(
            CONFIG_MODAL_FIELDS.maxQueueSize,
            stored.maxQueueSize === null ? '' : String(stored.maxQueueSize),
            3,
            `${i18n.t('config.default')} : ${resolveSettings().maxQueueSize}`
          )
        ),
      new LabelBuilder()
        .setLabel(i18n.t('config.fields.maxSongsPerUser'))
        .setDescription(i18n.t('config.modal.maxSongsPerUserHint', { max: QUEUE_LIMIT_CAP }))
        .setTextInputComponent(
          input(
            CONFIG_MODAL_FIELDS.maxSongsPerUser,
            settings.maxSongsPerUser === 0 ? '' : String(settings.maxSongsPerUser),
            3,
            i18n.t('config.unlimited')
          )
        )
    );
};

// The panel has no room left for a sixth row: the role picker lives in its own modal
export const blockedRolesModal = (stored: StoredSettings) => {
  const roles = new RoleSelectMenuBuilder()
    .setCustomId(CONFIG_MODAL_FIELDS.blockedRoles)
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(MAX_BLOCKED_ROLES);
  if (stored.blockedRoleIds.length > 0) roles.setDefaultRoles(stored.blockedRoleIds);

  return new ModalBuilder()
    .setCustomId(CONFIG_IDS.blockedRolesModal)
    .setTitle(i18n.t('config.blockedRolesModal.title'))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(i18n.t('config.fields.blockedRoles'))
        .setDescription(i18n.t('config.blockedRolesModal.hint'))
        .setRoleSelectMenuComponent(roles)
    );
};
