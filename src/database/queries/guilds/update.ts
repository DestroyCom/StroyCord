import { guild_model } from 'src/database/schema/guild';

import { emptyNextSongs } from './delete';
import { fetchGuild } from './get';

export const pushSongs = async (guildId: string, data: object[]) => {
  return await guild_model.updateOne({ guildId }, { $push: { nextSongs: { $each: data } } });
};

export const shiftSongs = async (guildId: string) => {
  //get the first song, move it to previouslyPlayedSongs and remove it from nextSongs
  const guild = await fetchGuild(guildId);
  if (guild.nextSongs === undefined) {
    return await emptyNextSongs(guildId);
  }
  const firstSong = guild.nextSongs[0];
  return await guild_model.updateOne(
    { guildId },
    {
      $push: { previouslyPlayedSongs: firstSong },
      $pop: { nextSongs: -1 },
    }
  );
};

export const updateVoiceChannel = async (guildId: string, data: object) => {
  return await guild_model.updateOne({ guildId }, { currentVoiceChannel: data });
};
