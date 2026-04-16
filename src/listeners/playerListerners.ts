import { AudioPlayerStatus } from '@discordjs/voice';
import type { AudioPlayer } from '@discordjs/voice';
import { sendEmbed } from 'src/core/messages';
import { remove, skipSong } from 'src/core/player';

export const createAudioPlayerListener = (audioPlayer: AudioPlayer, guildId: string) => {
  audioPlayer.on('stateChange', async (oldState, newState) => {
    if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
      skipSong(guildId);
      return;
    } else if (newState.status === AudioPlayerStatus.Playing && oldState.status === AudioPlayerStatus.Buffering) {
      sendEmbed(guildId);
      return;
    }
  });

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  audioPlayer.on('error', (error: any) => {
    try {
      remove(guildId);
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (errorCatch: any) {
      console.error('error', error);
      console.error('errorCatch', errorCatch);
    }
  });
};

export const removeAllAudioPlayerListener = (audioPlayer: AudioPlayer) => {
  audioPlayer.removeAllListeners();
};
