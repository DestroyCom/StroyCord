import {
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type SlashCommandStringOption,
} from 'discord.js';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import { getGuildSettings } from 'src/core/settings';
import { getStatsSummary, getTop, type TopKind } from 'src/database/queries/plays';
import {
  parseTopCustomId,
  periodStart,
  STATS_PERIODS,
  type StatsPeriod,
  serverStatsEmbed,
  TOP_PAGE_SIZE,
  topView,
  userStatsEmbed,
} from 'src/utils/embeds/statsEmbed';

const PERIOD_CHOICES: Record<StatsPeriod, { en: string; fr: string }> = {
  '7d': { en: 'Last 7 days', fr: '7 derniers jours' },
  '30d': { en: 'Last 30 days', fr: '30 derniers jours' },
  all: { en: 'All time', fr: 'Depuis le début' },
};

const periodOption = (option: SlashCommandStringOption) =>
  option
    .setName('period')
    .setDescription('Time range (default: all time)')
    .setDescriptionLocalizations({ fr: 'Période (par défaut : depuis le début)' })
    .addChoices(
      ...STATS_PERIODS.map((value) => ({
        name: PERIOD_CHOICES[value].en,
        name_localizations: { fr: PERIOD_CHOICES[value].fr },
        value,
      }))
    );

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Listening statistics of this server')
  .setDescriptionLocalizations({ fr: "Statistiques d'écoute du serveur" })
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('server')
      .setDescription('Overview: listening time, plays, most played song…')
      .setDescriptionLocalizations({ fr: "Vue d'ensemble : temps d'écoute, écoutes, titre le plus joué…" })
      .addStringOption(periodOption)
  )
  .addSubcommand((sub) =>
    sub
      .setName('top')
      .setDescription('Rankings of songs, artists or DJs')
      .setDescriptionLocalizations({ fr: 'Classements des titres, artistes ou DJs' })
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('What to rank')
          .setDescriptionLocalizations({ fr: 'Quoi classer' })
          .setRequired(true)
          .addChoices(
            { name: 'Songs', name_localizations: { fr: 'Titres' }, value: 'tracks' },
            { name: 'Artists', name_localizations: { fr: 'Artistes' }, value: 'artists' },
            { name: 'DJs (who adds the most)', name_localizations: { fr: 'DJs (qui ajoute le plus)' }, value: 'djs' }
          )
      )
      .addStringOption(periodOption)
  )
  .addSubcommand((sub) =>
    sub
      .setName('user')
      .setDescription("A member's stats (yours by default)")
      .setDescriptionLocalizations({ fr: "Stats d'un membre (les vôtres par défaut)" })
      .addUserOption((option) =>
        option
          .setName('member')
          .setDescription('Member to look at')
          .setDescriptionLocalizations({ fr: 'Membre à consulter' })
      )
      .addStringOption(periodOption)
  );

const readPeriod = (interaction: ChatInputCommandInteraction): StatsPeriod => {
  const value = interaction.options.getString('period');
  return STATS_PERIODS.find((period) => period === value) ?? 'all';
};

const ensureStatsEnabled = async (interaction: ChatInputCommandInteraction | ButtonInteraction) => {
  if ((await getGuildSettings(interaction.guildId as string)).statsEnabled) return true;
  await interaction.reply({ content: i18n.t('stats.disabled'), flags: MessageFlags.Ephemeral });
  return false;
};

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await ensureStatsEnabled(interaction))) return;
  const guildId = interaction.guildId as string;
  const period = readPeriod(interaction);
  const since = periodStart(period);
  // Aggregations can take a moment on big servers
  await interaction.deferReply();

  switch (interaction.options.getSubcommand()) {
    case 'top': {
      const kind = interaction.options.getString('type', true) as TopKind;
      const top = await getTop({ guildId, since }, kind, 0, TOP_PAGE_SIZE);
      await interaction.editReply(topView(kind, period, 0, top));
      return;
    }
    case 'user': {
      const user = interaction.options.getUser('member') ?? interaction.user;
      const filter = { guildId, since, userId: user.id };
      const [summary, top] = await Promise.all([
        getStatsSummary(filter, secrets.TIMEZONE),
        getTop(filter, 'tracks', 0, 5),
      ]);
      await interaction.editReply({ embeds: [userStatsEmbed(user, summary, top.entries, period)] });
      return;
    }
    default: {
      const summary = await getStatsSummary({ guildId, since }, secrets.TIMEZONE);
      await interaction.editReply({ embeds: [serverStatsEmbed(interaction.guild?.name ?? '', summary, period)] });
    }
  }
}

/** Pagination buttons of `/stats top` (customId built by topCustomId) */
export async function handleStatsInteraction(interaction: ButtonInteraction) {
  const parsed = parseTopCustomId(interaction.customId);
  if (!parsed) return;
  if (!(await ensureStatsEnabled(interaction))) return;

  const { kind, period } = parsed;
  const filter = { guildId: interaction.guildId as string, since: periodStart(period) };
  let page = parsed.page;
  let top = await getTop(filter, kind, page * TOP_PAGE_SIZE, TOP_PAGE_SIZE);
  // Stats may have shrunk since the message was sent (reset): fall back to the last page
  if (top.entries.length === 0 && top.total > 0) {
    page = Math.ceil(top.total / TOP_PAGE_SIZE) - 1;
    top = await getTop(filter, kind, page * TOP_PAGE_SIZE, TOP_PAGE_SIZE);
  }
  await interaction.update(topView(kind, period, page, top));
}
