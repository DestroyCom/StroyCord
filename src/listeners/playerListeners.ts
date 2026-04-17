import { type AudioPlayer, AudioPlayerStatus, getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { sendEmbed } from 'src/core/messages';
import { remove, skipSong } from 'src/core/player';
import { shiftSongs } from 'src/database/queries/guilds/update';

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

  audioPlayer.on('error', (error: unknown) => {
    console.error('[player] audio player error:', error);
    remove(guildId).catch((e) => console.error('[player] remove error:', e));
  });
};

export const removeAllAudioPlayerListener = (audioPlayer: AudioPlayer) => {
  audioPlayer.removeAllListeners();
};

export const voiceConnectionErrorListener = (guildId: string) => {
  getVoiceConnection(guildId)?.on('error', async () => {
    console.log(`An error occured in voice connection for guild ${guildId}`);
    await remove(guildId);
  });

  getVoiceConnection(guildId)?.on('stateChange', async (_, newState) => {
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      console.log(`Voice connection has been destroyed for guild ${guildId}`);
      await shiftSongs(guildId);
      await remove(guildId);
    }
  });
};
