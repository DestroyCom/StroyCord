import { PermissionFlagsBits } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetStoredSettings, mockUpdateGuildSettings, mockResetGuildSettings, mockDeletePlays, mockDeployCommands } =
  vi.hoisted(() => ({
    mockGetStoredSettings: vi.fn(),
    mockUpdateGuildSettings: vi.fn(),
    mockResetGuildSettings: vi.fn(),
    mockDeletePlays: vi.fn(),
    mockDeployCommands: vi.fn(),
  }));

vi.mock('src/config/secrets', () => ({
  secrets: {
    PREFIX: '&',
    LANGUAGE: 'en-US',
    DETECT_FROM_ALL_MESSAGES: false,
    MAX_QUEUE_SIZE: 100,
    STROYCORD_LOGO: 'https://example.com/logo.png',
  },
}));
vi.mock('src/core/settings', () => ({
  getStoredSettings: mockGetStoredSettings,
  updateGuildSettings: mockUpdateGuildSettings,
  resetGuildSettings: mockResetGuildSettings,
}));
vi.mock('src/database/queries/plays', () => ({ deletePlays: mockDeletePlays }));
vi.mock('src/deploy-commands', () => ({ deployCommands: mockDeployCommands }));

import { data, handleConfigInteraction } from 'src/commands/slashCommands/config';
import { runWithSettings } from 'src/config/guildContext';
import { DEFAULT_STORED_SETTINGS, resolveSettings } from 'src/config/settings';
import {
  blockedRolesModal,
  CONFIG_IDS,
  configConfirmation,
  configModal,
  configPanel,
} from 'src/utils/embeds/configEmbed';

const stored = {
  ...DEFAULT_STORED_SETTINGS,
  prefix: '!',
  commandChannelIds: ['111111111111111111', '222222222222222222'],
  maxSongsPerUser: 5,
  replyChannelId: '333333333333333333',
};

describe('config panel builders', () => {
  it.each(['en-US', 'fr-FR'] as const)('produce valid Discord payloads in %s', (language) => {
    runWithSettings({ ...resolveSettings(), language }, () => {
      const panel = configPanel(stored, new Set(['111111111111111111', '333333333333333333']), 'saved');
      for (const embed of panel.embeds) expect(() => embed.toJSON()).not.toThrow();
      // Discord allows at most 5 rows of at most 5 buttons
      expect(panel.components.length).toBeLessThanOrEqual(5);
      for (const row of panel.components) {
        expect(() => row.toJSON()).not.toThrow();
        expect(row.toJSON().components.length).toBeLessThanOrEqual(5);
      }
      const channelMenu = panel.components[1].toJSON().components[0] as { default_values?: { id: string }[] };
      // Deleted channels can't be preselected
      expect(channelMenu.default_values).toEqual([{ id: '111111111111111111', type: 'channel' }]);
      const replyMenu = panel.components[2].toJSON().components[0] as { default_values?: { id: string }[] };
      expect(replyMenu.default_values).toEqual([{ id: '333333333333333333', type: 'channel' }]);
      expect(() => configModal(stored).toJSON()).not.toThrow();
      expect(() => blockedRolesModal({ ...stored, blockedRoleIds: ['444444444444444444'] }).toJSON()).not.toThrow();
      for (const target of ['settings', 'stats'] as const) {
        const confirmation = configConfirmation(target);
        expect(() => confirmation.components[0].toJSON()).not.toThrow();
      }
    });
  });

  it('declares an admin-only, guild-only command', () => {
    const json = data.toJSON();
    expect(json.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
    expect(json.contexts).toEqual([0]);
  });
});

const fakeInteraction = (overrides: Record<string, unknown>) => ({
  guildId: 'g1',
  guild: null,
  user: { id: 'admin' },
  memberPermissions: { has: () => true },
  reply: vi.fn(),
  update: vi.fn(),
  showModal: vi.fn(),
  isModalSubmit: () => false,
  isStringSelectMenu: () => false,
  isChannelSelectMenu: () => false,
  isFromMessage: () => true,
  ...overrides,
});

type ConfigInteraction = Parameters<typeof handleConfigInteraction>[0];

describe('handleConfigInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoredSettings.mockResolvedValue(DEFAULT_STORED_SETTINGS);
    mockUpdateGuildSettings.mockImplementation(async (_g, patch) => ({ ...DEFAULT_STORED_SETTINGS, ...patch }));
  });

  it('refuses members without Manage Server', async () => {
    const interaction = fakeInteraction({ customId: CONFIG_IDS.toggleStats, memberPermissions: { has: () => false } });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: expect.anything() }));
    expect(mockUpdateGuildSettings).not.toHaveBeenCalled();
    expect(interaction.update).not.toHaveBeenCalled();
  });

  it('toggles statistics and refreshes the panel', async () => {
    const interaction = fakeInteraction({ customId: CONFIG_IDS.toggleStats });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { statsEnabled: false }, 'admin');
    expect(interaction.update).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
  });

  it('stores the selected command channels', async () => {
    const interaction = fakeInteraction({
      customId: CONFIG_IDS.channels,
      isChannelSelectMenu: () => true,
      values: ['c1', 'c2'],
    });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { commandChannelIds: ['c1', 'c2'] }, 'admin');
  });

  it('stores the reply channel, or clears it when nothing is selected', async () => {
    const select = (values: string[]) =>
      fakeInteraction({ customId: CONFIG_IDS.replyChannel, isChannelSelectMenu: () => true, values });
    await handleConfigInteraction(select(['r1']) as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { replyChannelId: 'r1' }, 'admin');
    await handleConfigInteraction(select([]) as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { replyChannelId: null }, 'admin');
  });

  it('toggles the bot replies', async () => {
    const interaction = fakeInteraction({ customId: CONFIG_IDS.toggleReplies });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { replyMessagesEnabled: false }, 'admin');
  });

  it('cycles the command mode and redeploys the slash commands', async () => {
    const interaction = fakeInteraction({ customId: CONFIG_IDS.cycleCommandMode });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { commandMode: 'text' }, 'admin');
    expect(interaction.update).toHaveBeenCalled();
    expect(mockDeployCommands).toHaveBeenCalledWith({ guildId: 'g1' });
  });

  it('redeploys the slash commands after a settings reset', async () => {
    mockResetGuildSettings.mockResolvedValue(DEFAULT_STORED_SETTINGS);
    const interaction = fakeInteraction({ customId: CONFIG_IDS.confirmResetSettings });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockDeployCommands).toHaveBeenCalledWith({ guildId: 'g1' });
  });

  it('opens the blocked roles picker', async () => {
    const interaction = fakeInteraction({ customId: CONFIG_IDS.blockedRoles });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(interaction.showModal).toHaveBeenCalled();
    expect(mockUpdateGuildSettings).not.toHaveBeenCalled();
  });

  it('stores the blocked roles, or clears them when nothing is selected', async () => {
    const submit = (roles: Map<string, unknown> | null) =>
      fakeInteraction({
        customId: CONFIG_IDS.blockedRolesModal,
        isModalSubmit: () => true,
        fields: { getSelectedRoles: () => roles },
      });
    await handleConfigInteraction(
      submit(
        new Map([
          ['r1', {}],
          ['r2', {}],
        ])
      ) as unknown as ConfigInteraction
    );
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { blockedRoleIds: ['r1', 'r2'] }, 'admin');
    await handleConfigInteraction(submit(null) as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith('g1', { blockedRoleIds: [] }, 'admin');
  });

  it('only deletes statistics after confirmation', async () => {
    const ask = fakeInteraction({ customId: CONFIG_IDS.resetStats });
    await handleConfigInteraction(ask as unknown as ConfigInteraction);
    expect(mockDeletePlays).not.toHaveBeenCalled();

    const confirm = fakeInteraction({ customId: CONFIG_IDS.confirmResetStats });
    await handleConfigInteraction(confirm as unknown as ConfigInteraction);
    expect(mockDeletePlays).toHaveBeenCalledWith(['g1']);
  });

  const modal = (values: Record<string, string>) =>
    fakeInteraction({
      customId: CONFIG_IDS.modal,
      isModalSubmit: () => true,
      fields: { getTextInputValue: (id: string) => values[id] ?? '' },
    });

  it('saves valid modal values', async () => {
    const interaction = modal({ prefix: '!', maxQueueSize: '20', maxSongsPerUser: '' });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).toHaveBeenCalledWith(
      'g1',
      { prefix: '!', maxQueueSize: 20, maxSongsPerUser: 0 },
      'admin'
    );
    expect(interaction.update).toHaveBeenCalled();
  });

  it('rejects invalid modal values without saving', async () => {
    const interaction = modal({ prefix: 'way too long', maxQueueSize: '9999' });
    await handleConfigInteraction(interaction as unknown as ConfigInteraction);
    expect(mockUpdateGuildSettings).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('⚠️') }));
  });
});
