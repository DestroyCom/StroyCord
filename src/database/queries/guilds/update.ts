import { guild_model, HISTORY_SIZE } from 'src/database/schema/guild';
import type { songInterface } from 'src/utils/interfaces';
import { emptyNextSongs } from './delete';

import { fetchGuild } from './get';

export const pushSongs = async (guildId: string, data: object[]) => {
  return await guild_model.updateOne({ guildId }, { $push: { nextSongs: { $each: data } } });
};

export type QueueLimitReason = 'queueFull' | 'userLimit';

interface QueueLimits {
  maxQueueSize: number;
  /** 0 = unlimited */
  maxSongsPerUser: number;
}

const userSongCount = (userId: string) => ({
  $size: {
    $filter: { input: { $ifNull: ['$nextSongs', []] }, cond: { $eq: ['$$this.requestAuthor.id', userId] } },
  },
});

/**
 * Atomically appends a song if the queue (song currently playing included) is under both limits,
 * so concurrent requests (e.g. two playlists) can't overflow it.
 */
export const pushSongIfAllowed = async (
  guildId: string,
  song: songInterface,
  { maxQueueSize, maxSongsPerUser }: QueueLimits
): Promise<'queued' | QueueLimitReason> => {
  const userId = song.requestAuthor.id;
  const conditions: object[] = [{ $lt: [{ $size: { $ifNull: ['$nextSongs', []] } }, maxQueueSize] }];
  if (maxSongsPerUser > 0) conditions.push({ $lt: [userSongCount(userId), maxSongsPerUser] });
  const push = () => guild_model.updateOne({ guildId, $expr: { $and: conditions } }, { $push: { nextSongs: song } });

  if ((await push()).modifiedCount === 1) return 'queued';

  // Rejected (or the guild document doesn't exist yet): find out which limit applies
  const nextSongs = ((await fetchGuild(guildId)).nextSongs ?? []) as songInterface[];
  if (nextSongs.length >= maxQueueSize) return 'queueFull';
  if (maxSongsPerUser > 0 && nextSongs.filter((s) => s.requestAuthor?.id === userId).length >= maxSongsPerUser) {
    return 'userLimit';
  }
  return (await push()).modifiedCount === 1 ? 'queued' : 'queueFull';
};

export const shiftSongs = async (guildId: string) => {
  //get the first song, move it to previouslyPlayedSongs and remove it from nextSongs
  const guild = await fetchGuild(guildId);
  if (guild.nextSongs == null || guild.nextSongs.length === 0) {
    return await emptyNextSongs(guildId);
  }
  const firstSong = guild.nextSongs[0];
  return await guild_model.updateOne(
    { guildId },
    {
      $push: { previouslyPlayedSongs: { $each: [firstSong], $slice: -HISTORY_SIZE } },
      $pop: { nextSongs: -1 },
    }
  );
};

// nextSongs[0] is the song playing: queue edits only reorder or remove the songs waiting after it.
// Each edit is a single pipeline update, so a song ending meanwhile (shiftSongs) can't interleave with it.
const queue = { $ifNull: ['$nextSongs', []] };
const playingSong = { $slice: [queue, 1] };
// $slice needs a positive count, even on an empty queue
const waitingSongs = { $slice: [queue, 1, { $max: [1, { $size: queue }] }] };

const rewriteQueue = (guildId: string, nextSongs: object) =>
  guild_model.findOneAndUpdate({ guildId }, [{ $set: { nextSongs } }], {
    updatePipeline: true,
    returnDocument: 'before',
  });

const waitingBefore = (guild: { nextSongs?: unknown[] | null } | null) =>
  (guild?.nextSongs ?? []).slice(1) as songInterface[];

/** Removes the waiting songs of a playlist (the song playing keeps playing). Returns how many were removed. */
export const removePlaylistSongs = async (guildId: string, playlistId: string): Promise<number> => {
  const before = await rewriteQueue(guildId, {
    $concatArrays: [
      playingSong,
      { $filter: { input: waitingSongs, cond: { $ne: ['$$this.playlist.id', playlistId] } } },
    ],
  });
  return waitingBefore(before).filter((song) => song.playlist?.id === playlistId).length;
};

/** Moves a waiting song right after the one playing. Returns it, or null when it is no longer waiting. */
export const prioritizeSong = async (guildId: string, queueId: string): Promise<songInterface | null> => {
  const isTarget = { $eq: ['$$this.queueId', queueId] };
  const before = await rewriteQueue(guildId, {
    $concatArrays: [
      playingSong,
      { $filter: { input: waitingSongs, cond: isTarget } },
      { $filter: { input: waitingSongs, cond: { $not: [isTarget] } } },
    ],
  });
  return waitingBefore(before).find((song) => song.queueId === queueId) ?? null;
};

export const updateVoiceChannel = async (guildId: string, data: object) => {
  return await guild_model.updateOne({ guildId }, { currentVoiceChannel: data });
};
