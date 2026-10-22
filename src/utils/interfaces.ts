import type { AudioPlayer } from '@discordjs/voice';
import type { EmbedBuilder, User } from 'discord.js';

export interface activePlayersInterface {
  [guildId: string]: {
    audioPlayer: AudioPlayer;
  };
}

/** The playlist a queued song comes from: one id per request, so the same playlist queued twice is two entries */
export interface QueuedPlaylist {
  id: string;
  title: string;
}

export interface songInterface {
  /** Unique per queued song: targets it in the queue whatever its position (see prioritizeSong) */
  queueId?: string;
  playlist?: QueuedPlaylist;
  title: string;
  url: string;
  thumbnail: string;
  videoAuthor: string;
  videoLength: string;
  minutes: number;
  seconds: number;
  requestDateTimestamp: number;
  requestAuthor: {
    id: string;
    username: string;
  };
  requestChannel: string;
  isQueueStart: boolean;
  isComingFromPlaylist: boolean;
}

export interface embedChecksInterface {
  noAuthorEmbed: EmbedBuilder;
  author: User | undefined;
  iconURL: string;
}

export interface MessageFormaterInterface {
  splittedMessage: string[];
  command: string;
}

export interface PlaylistInfo {
  url: string;
  title: string;
  author: { name: string };
  items: Array<{ url: string; thumbnail?: string }>;
  addedCount: number;
  /** Songs not queued (queue limit reached or unavailable video) */
  skippedCount: number;
  limitReached?: 'queueFull' | 'userLimit';
}
