import { type AudioPlayer, AudioPlayerStatus, getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { captureError } from 'src/config/monitoring';
import { sendEmbed } from 'src/core/messages';
import { remove, skipSong } from 'src/core/player';
import { shiftSongs } from 'src/database/queries/guilds/update';

export const createAudioPlayerListener = (audioPlayer: AudioPlayer, guildId: string) => {
  audioPlayer.on('stateChange', async (oldState, newState) => {
    // Playing → Idle: track finished. Buffering → Idle: the stream ended before
    // playback started (e.g. yt-dlp failed) — move on instead of stalling the queue.
    if (
      newState.status === AudioPlayerStatus.Idle &&
      (oldState.status === AudioPlayerStatus.Playing || oldState.status === AudioPlayerStatus.Buffering)
    ) {
      try {
        await skipSong(guildId);
      } catch (e) {
        console.error('[player] skipSong error:', e);
        captureError(e, { guildId, step: 'skipSong' });
      }
      return;
    } else if (newState.status === AudioPlayerStatus.Playing && oldState.status === AudioPlayerStatus.Buffering) {
      try {
        await sendEmbed(guildId);
      } catch (e) {
        console.error('[player] sendEmbed error:', e);
        captureError(e, { guildId, step: 'sendEmbed' });
      }
      return;
    }
  });

  audioPlayer.on('error', (error: unknown) => {
    console.error('[player] audio player error:', error);
    captureError(error, { guildId, step: 'audioPlayer' });
    remove(guildId).catch((e) => {
      console.error('[player] remove error:', e);
      captureError(e, { guildId, step: 'remove' });
    });
  });
};

export const removeAllAudioPlayerListener = (audioPlayer: AudioPlayer) => {
  audioPlayer.removeAllListeners();
};

export const voiceConnectionErrorListener = (guildId: string) => {
  getVoiceConnection(guildId)?.on('error', async (error) => {
    console.log(`An error occured in voice connection for guild ${guildId}`);
    captureError(error, { guildId, step: 'voiceConnection' });
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
