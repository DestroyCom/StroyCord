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
