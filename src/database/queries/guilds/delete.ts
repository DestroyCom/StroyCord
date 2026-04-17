import { guild_model } from 'src/database/schema/guild';

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
    { $push: { previouslyPlayedSongs: firstSong }, $pop: { nextSongs: -1 } }
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
