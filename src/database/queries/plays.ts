import type { PipelineStage } from 'mongoose';
import { play_model } from 'src/database/schema/play';

export interface PlayRecord {
  guildId: string;
  videoId: string;
  title: string;
  videoAuthor: string;
  durationSec: number;
  listenedMs: number;
  requestedBy: { id: string; username: string };
  fromPlaylist: boolean;
  skipped: boolean;
  startedAt: Date;
  endedAt: Date;
}

export const insertPlay = async (play: PlayRecord) => {
  return await play_model.create(play);
};

export const deletePlays = async (guildIds: string[]) => {
  return await play_model.deleteMany({ guildId: { $in: guildIds } });
};

export interface StatsFilter {
  guildId: string;
  since?: Date;
  /** Only plays requested by this member */
  userId?: string;
}

export type TopKind = 'tracks' | 'artists' | 'djs';

export interface TopEntry {
  /** videoId, artist name or user id */
  key: string;
  /** Track title, artist name or username */
  label: string;
  /** Artist of a track */
  detail?: string;
  plays: number;
  listenedMs: number;
}

export interface StatsSummary {
  plays: number;
  listenedMs: number;
  skipped: number;
  uniqueTracks: number;
  topTrack?: TopEntry;
  topArtist?: TopEntry;
  topDj?: TopEntry;
  /** 0-23, in the configured timezone */
  peakHour?: number;
}

const matchStage = ({ guildId, since, userId }: StatsFilter): PipelineStage.Match => ({
  $match: {
    guildId,
    ...(since ? { startedAt: { $gte: since } } : {}),
    ...(userId ? { 'requestedBy.id': userId } : {}),
  },
});

// Ties are broken by total time then key, so pagination is stable
const rankStages: PipelineStage.FacetPipelineStage[] = [{ $sort: { plays: -1, listenedMs: -1, _id: 1 } }];

const groupStages: Record<TopKind, PipelineStage.FacetPipelineStage[]> = {
  tracks: [
    {
      $group: {
        _id: '$videoId',
        label: { $last: '$title' },
        detail: { $last: '$videoAuthor' },
        plays: { $sum: 1 },
        listenedMs: { $sum: '$listenedMs' },
      },
    },
  ],
  artists: [
    { $match: { videoAuthor: { $nin: ['', null] } } },
    {
      $group: {
        _id: '$videoAuthor',
        label: { $last: '$videoAuthor' },
        plays: { $sum: 1 },
        listenedMs: { $sum: '$listenedMs' },
      },
    },
  ],
  djs: [
    {
      $group: {
        _id: '$requestedBy.id',
        label: { $last: '$requestedBy.username' },
        plays: { $sum: 1 },
        listenedMs: { $sum: '$listenedMs' },
      },
    },
  ],
};

type RawEntry = { _id: string; label?: string; detail?: string; plays: number; listenedMs: number };

const toEntry = (raw?: RawEntry): TopEntry | undefined =>
  raw && {
    key: String(raw._id),
    label: raw.label ?? String(raw._id),
    ...(raw.detail ? { detail: raw.detail } : {}),
    plays: raw.plays,
    listenedMs: raw.listenedMs,
  };

export const getStatsSummary = async (filter: StatsFilter, timezone: string): Promise<StatsSummary> => {
  const [result] = await play_model.aggregate([
    matchStage(filter),
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              plays: { $sum: 1 },
              listenedMs: { $sum: '$listenedMs' },
              skipped: { $sum: { $cond: ['$skipped', 1, 0] } },
            },
          },
        ],
        uniqueTracks: [{ $group: { _id: '$videoId' } }, { $count: 'count' }],
        topTrack: [...groupStages.tracks, ...rankStages, { $limit: 1 }],
        topArtist: [...groupStages.artists, ...rankStages, { $limit: 1 }],
        topDj: [...groupStages.djs, ...rankStages, { $limit: 1 }],
        peakHour: [
          { $group: { _id: { $hour: { date: '$startedAt', timezone } }, plays: { $sum: 1 } } },
          { $sort: { plays: -1, _id: 1 } },
          { $limit: 1 },
        ],
      },
    },
  ]);

  const totals = result?.totals[0];
  return {
    plays: totals?.plays ?? 0,
    listenedMs: totals?.listenedMs ?? 0,
    skipped: totals?.skipped ?? 0,
    uniqueTracks: result?.uniqueTracks[0]?.count ?? 0,
    topTrack: toEntry(result?.topTrack[0]),
    topArtist: toEntry(result?.topArtist[0]),
    topDj: toEntry(result?.topDj[0]),
    peakHour: result?.peakHour[0]?._id,
  };
};

export const getTop = async (
  filter: StatsFilter,
  kind: TopKind,
  skip: number,
  limit: number
): Promise<{ entries: TopEntry[]; total: number }> => {
  const [result] = await play_model.aggregate([
    matchStage(filter),
    ...groupStages[kind],
    { $facet: { entries: [...rankStages, { $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  return {
    entries: (result?.entries ?? []).map((raw: RawEntry) => toEntry(raw) as TopEntry),
    total: result?.total[0]?.count ?? 0,
  };
};
