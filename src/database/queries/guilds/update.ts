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

export const updateVoiceChannel = async (guildId: string, data: object) => {
  return await guild_model.updateOne({ guildId }, { currentVoiceChannel: data });
};
