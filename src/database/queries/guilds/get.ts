import { guild_model } from 'src/database/schema/guild';
import type { songInterface } from 'src/utils/interfaces';

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

export interface QueuedPlaylistSummary {
  id: string;
  title: string;
  /** Songs of the playlist still waiting (the one playing excluded) */
  count: number;
  requestedBy: string;
}

/** Playlists with songs waiting in the queue, in queue order */
export const getQueuedPlaylists = async (guildId: string): Promise<QueuedPlaylistSummary[]> => {
  const playlists = new Map<string, QueuedPlaylistSummary>();
  for (const song of (await getNextSongs(guildId)) as songInterface[]) {
    if (!song.playlist) continue;
    const entry = playlists.get(song.playlist.id);
    if (entry) entry.count++;
    else
      playlists.set(song.playlist.id, {
        ...song.playlist,
        count: 1,
        requestedBy: song.requestAuthor.username,
      });
  }
  return [...playlists.values()];
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
