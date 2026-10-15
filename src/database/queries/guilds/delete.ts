import { guild_model, HISTORY_SIZE } from 'src/database/schema/guild';

import { fetchGuild } from './get';

export const emptyNextSongs = async (guildId: string) => {
  return await guild_model.updateOne({ guildId }, { nextSongs: [] });
};

export const removeCurrentPlayingSong = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  if (guild.nextSongs == null) {
    return await emptyNextSongs(guildId);
  }
  const firstSong = guild.nextSongs[0];
  return await guild_model.updateOne(
    { guildId },
    { $push: { previouslyPlayedSongs: { $each: [firstSong], $slice: -HISTORY_SIZE } }, $pop: { nextSongs: -1 } }
  );
};

export const emptyAllGuild = async () => {
  try {
    await guild_model.updateMany({}, { nextSongs: [], currentVoiceChannel: {} });
    console.log('All guilds have been emptied !');
  } catch (error) {
    console.log(error);
    console.log('Error emptying all guilds !');
  }
};

export const removeGuild = async (guildId: string) => {
  return await guild_model.deleteOne({ guildId });
};

// Older versions could create several documents for one guild (non-atomic fetchGuild):
// keep the oldest one so the unique index on guildId can be built
export const removeDuplicateGuilds = async () => {
  const duplicates = await guild_model.aggregate<{ ids: unknown[] }>([
    { $sort: { _id: 1 } },
    { $group: { _id: '$guildId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  const extraIds = duplicates.flatMap(({ ids }) => ids.slice(1));
  if (extraIds.length === 0) return 0;
  await guild_model.deleteMany({ _id: { $in: extraIds } });
  return extraIds.length;
};
