import { AudioPlayer } from '@discordjs/voice';
import { EmbedBuilder, User } from 'discord.js';

export interface activePlayersInterface {
  [guildId: string]: {
    audioPlayer: AudioPlayer;
  };
}

export interface songInterface {
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
