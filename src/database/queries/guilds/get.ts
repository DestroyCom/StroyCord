import { guild_model } from 'src/database/schema/guild';

export const fetchGuild = async (guildId: string) => {
  if (!guildId) throw new Error('GuildID not specified !');

  // Atomic upsert: two concurrent calls can't create two documents for the same guild
  const upsert = () =>
    guild_model.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, returnDocument: 'after' });
  let guild: Awaited<ReturnType<typeof upsert>>;
  try {
    guild = await upsert();
  } catch (error) {
    // Concurrent upserts can still race on the unique index: the other insert won, read it back
    if ((error as { code?: number }).code !== 11000) throw error;
    guild = await upsert();
  }
  if (!guild) throw new Error(`Guild ${guildId} could not be created`);
  return guild;
};

/* export const getSongs = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.nextSongs;
}; */

export const getFirstSong = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  if (!guild.nextSongs) return [];
  return guild.nextSongs[0];
};

export const getNextSongs = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  if (!guild.nextSongs) return [];
  return guild.nextSongs.slice(1);
};

export const getLastPlayedSong = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  if (!guild.previouslyPlayedSongs) return [];
  return guild.previouslyPlayedSongs[guild.previouslyPlayedSongs.length - 1];
};

export const getCurrentVoiceChannel = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.currentVoiceChannel;
};
