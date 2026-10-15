import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from 'discord.js';
import i18n from 'src/config/i18n';
import { secrets } from 'src/config/secrets';
import type { StatsSummary, TopEntry, TopKind } from 'src/database/queries/plays';

export const STATS_PERIODS = ['7d', '30d', 'all'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];
export const TOP_KINDS: readonly TopKind[] = ['tracks', 'artists', 'djs'];
export const TOP_PAGE_SIZE = 10;

const PERIOD_DAYS: Record<StatsPeriod, number | null> = { '7d': 7, '30d': 30, all: null };

export const periodStart = (period: StatsPeriod, now = Date.now()) => {
  const days = PERIOD_DAYS[period];
  return days === null ? undefined : new Date(now - days * 24 * 60 * 60 * 1000);
};

export const formatDuration = (ms: number) => {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return `< 1 ${i18n.t('stats.units.minutes')}`;
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days > 0 ? `${days} ${i18n.t('stats.units.days')}` : '',
    hours > 0 ? `${hours} ${i18n.t('stats.units.hours')}` : '',
    minutes > 0 ? `${minutes} ${i18n.t('stats.units.minutes')}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const plays = (count: number) => `${count} ${i18n.t(count > 1 ? 'stats.units.plays' : 'stats.units.play')}`;

const describeEntry = (kind: TopKind, entry: TopEntry) => {
  switch (kind) {
    case 'tracks':
      return `[${entry.label}](https://youtu.be/${entry.key})${entry.detail ? ` — ${entry.detail}` : ''}`;
    case 'artists':
      return entry.label;
    case 'djs':
      return `<@${entry.key}>`;
  }
};

const baseEmbed = (title: string, period: StatsPeriod) =>
  new EmbedBuilder()
    .setTitle(title)
    .setAuthor({ name: 'Stroycord', iconURL: secrets.STROYCORD_LOGO })
    .setFooter({ text: i18n.t(`stats.periods.${period}`) })
    .setColor('#C4302B')
    .setTimestamp();

const emptyEmbed = (title: string, period: StatsPeriod) =>
  baseEmbed(title, period).setDescription(`🤔 ${i18n.t('stats.empty')}`);

const summaryFields = (summary: StatsSummary) => [
  { name: `⏱️ ${i18n.t('stats.fields.listeningTime')}`, value: formatDuration(summary.listenedMs), inline: true },
  { name: `🎵 ${i18n.t('stats.fields.plays')}`, value: String(summary.plays), inline: true },
  { name: `💿 ${i18n.t('stats.fields.uniqueTracks')}`, value: String(summary.uniqueTracks), inline: true },
  {
    name: `⏭️ ${i18n.t('stats.fields.skipRate')}`,
    value: `${Math.round((summary.skipped / summary.plays) * 100)} %`,
    inline: true,
  },
  ...(summary.peakHour === undefined
    ? []
    : [
        {
          name: `🕒 ${i18n.t('stats.fields.peakHour')}`,
          value: `${summary.peakHour}h – ${summary.peakHour + 1}h`,
          inline: true,
        },
      ]),
];

export const serverStatsEmbed = (guildName: string, summary: StatsSummary, period: StatsPeriod) => {
  const title = `📊 ${i18n.t('stats.titles.server')} ${guildName}`;
  if (summary.plays === 0) return emptyEmbed(title, period);

  const embed = baseEmbed(title, period).addFields(summaryFields(summary));
  if (summary.topTrack) {
    embed.addFields({
      name: `🏆 ${i18n.t('stats.fields.topTrack')}`,
      value: `${describeEntry('tracks', summary.topTrack)} (${plays(summary.topTrack.plays)})`,
    });
  }
  if (summary.topArtist) {
    embed.addFields({
      name: `🎤 ${i18n.t('stats.fields.topArtist')}`,
      value: `${summary.topArtist.label} (${plays(summary.topArtist.plays)})`,
      inline: true,
    });
  }
  if (summary.topDj) {
    embed.addFields({
      name: `🎧 ${i18n.t('stats.fields.topDj')}`,
      value: `<@${summary.topDj.key}> (${plays(summary.topDj.plays)})`,
      inline: true,
    });
  }
  return embed;
};

export const userStatsEmbed = (user: User, summary: StatsSummary, topTracks: TopEntry[], period: StatsPeriod) => {
  const title = `📊 ${i18n.t('stats.titles.user')} ${user.username}`;
  if (summary.plays === 0) return emptyEmbed(title, period).setThumbnail(user.displayAvatarURL());

  const embed = baseEmbed(title, period)
    .setDescription(i18n.t('stats.userDescription'))
    .setThumbnail(user.displayAvatarURL())
    .addFields(summaryFields(summary));
  if (summary.topArtist) {
    embed.addFields({
      name: `🎤 ${i18n.t('stats.fields.topArtist')}`,
      value: `${summary.topArtist.label} (${plays(summary.topArtist.plays)})`,
    });
  }
  if (topTracks.length > 0) {
    embed.addFields({
      name: `🏆 ${i18n.t('stats.fields.favoriteTracks')}`,
      value: topTracks
        .map((entry, index) => `${index + 1}. ${describeEntry('tracks', entry)} (${plays(entry.plays)})`)
        .join('\n'),
    });
  }
  return embed;
};

// customId: stats:top:<kind>:<period>:<page>, parsed back by parseTopCustomId
export const topCustomId = (kind: TopKind, period: StatsPeriod, page: number) => `stats:top:${kind}:${period}:${page}`;

export const parseTopCustomId = (customId: string) => {
  const [prefix, view, kind, period, page] = customId.split(':');
  const pageNumber = Number(page);
  if (prefix !== 'stats' || view !== 'top') return null;
  if (!TOP_KINDS.includes(kind as TopKind) || !STATS_PERIODS.includes(period as StatsPeriod)) return null;
  if (!Number.isInteger(pageNumber) || pageNumber < 0) return null;
  return { kind: kind as TopKind, period: period as StatsPeriod, page: pageNumber };
};

export const topView = (
  kind: TopKind,
  period: StatsPeriod,
  page: number,
  { entries, total }: { entries: TopEntry[]; total: number }
) => {
  const title = `🏆 ${i18n.t(`stats.titles.top.${kind}`)}`;
  if (total === 0) return { embeds: [emptyEmbed(title, period)], components: [] };

  const pageCount = Math.ceil(total / TOP_PAGE_SIZE);
  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((entry, index) => {
    const rank = page * TOP_PAGE_SIZE + index;
    const position = medals[rank] ?? `**${rank + 1}.**`;
    return `${position} ${describeEntry(kind, entry)} — ${plays(entry.plays)}, ${formatDuration(entry.listenedMs)}`;
  });

  const embed = baseEmbed(title, period)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${i18n.t(`stats.periods.${period}`)} · ${page + 1}/${pageCount}` });

  const components =
    pageCount > 1
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(topCustomId(kind, period, page - 1))
              .setEmoji('◀️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId(topCustomId(kind, period, page + 1))
              .setEmoji('▶️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page >= pageCount - 1)
          ),
        ]
      : [];

  return { embeds: [embed], components };
};
