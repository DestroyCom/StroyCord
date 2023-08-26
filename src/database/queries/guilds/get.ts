import { guild_model } from 'src/database/schema/guild';

export const fetchGuild = async (guildId: string) => {
  if (!guildId) throw new Error('GuildID not specified !');

  const guild = await guild_model.findOne({ guildId });
  if (guild) return guild;
  const query = new guild_model({ guildId });
  await query.save();

  return query;
};

export const getSongs = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.nextSongs;
};

export const getFirstSong = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.nextSongs[0];
};

export const getNextSongs = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.nextSongs.slice(1);
};

export const getLastPlayedSong = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.previouslyPlayedSongs[guild.previouslyPlayedSongs.length - 1];
};

export const getCurrentVoiceChannel = async (guildId: string) => {
  const guild = await fetchGuild(guildId);
  return guild.currentVoiceChannel;
};
