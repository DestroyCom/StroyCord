import type { ChildProcess } from 'node:child_process';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import { activePlayers, client } from 'src/Bot';
import { captureError, captureMessage } from 'src/config/monitoring';
import { sendErrorEmbed } from 'src/core/messages';
import { createYtdlpStream, extractYtdlpError } from 'src/core/ytdlp';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { getCurrentVoiceChannel, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import {
  createAudioPlayerListener,
  removeAllAudioPlayerListener,
  voiceConnectionErrorListener,
} from 'src/listeners/playerListeners';
import type { songInterface } from 'src/utils/interfaces';

// Current yt-dlp process per guild, killed on skip/stop so it doesn't linger in the background
const ytdlpProcesses = new Map<string, ChildProcess>();

const killYtdlp = (guildId: string) => {
  const proc = ytdlpProcesses.get(guildId);
  ytdlpProcesses.delete(guildId);
  if (proc && proc.exitCode === null && !proc.killed) proc.kill();
};

export const songPlayer = async (guildId: string) => {
  const voiceChannel = await getCurrentVoiceChannel(guildId);
  const nextSong: songInterface = await getFirstSong(guildId);
  const adapterCreator = (await client.guilds.fetch(voiceChannel.guildId)).voiceAdapterCreator;
  let audioPlayer = activePlayers[guildId]?.audioPlayer;

  if (nextSong === undefined) {
    return;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.channelId,
    guildId: voiceChannel.guildId,
    adapterCreator,
  });

  if (!audioPlayer) {
    audioPlayer = createAudioPlayer();
    activePlayers[guildId] = {
      audioPlayer,
    };

    createAudioPlayerListener(audioPlayer, guildId);
  }

  killYtdlp(guildId);
  const ytdlp = createYtdlpStream(nextSong.url);
  ytdlpProcesses.set(guildId, ytdlp);

  let stderrBuf = '';
  ytdlp.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  ytdlp.on('error', async (e) => {
    console.error('[player] yt-dlp spawn error:', e);
    captureError(e, { guildId, url: nextSong.url, step: 'yt-dlp spawn' });
    await sendErrorEmbed(guildId, nextSong.requestChannel, `Failed to start playback for: **${nextSong.title}**`);
  });

  ytdlp.on('close', async (code) => {
    if (ytdlpProcesses.get(guildId) === ytdlp) ytdlpProcesses.delete(guildId);
    const msg = stderrBuf.trim();
    if (msg) console.error(`[player] yt-dlp: ${msg}`);
    // code === null means the process was killed (skip / stop) — not an error
    if (code !== 0 && code !== null) {
      const reason = extractYtdlpError(msg);
      captureMessage(`yt-dlp failed: ${reason ?? `exit code ${code}`}`, {
        guildId,
        url: nextSong.url,
        title: nextSong.title,
        exitCode: code,
        stderr: msg.slice(-4000),
      });
      await sendErrorEmbed(
        guildId,
        nextSong.requestChannel,
        reason ? `**${nextSong.title}** — ${reason}` : `Could not play **${nextSong.title}** (yt-dlp exited ${code})`
      );
    }
  });

  console.log(`[player] streaming ${nextSong.url} via yt-dlp`);
  const audioStream = createAudioResource(ytdlp.stdout, {
    inputType: StreamType.Arbitrary,
  });

  audioPlayer.play(audioStream);
  connection.subscribe(audioPlayer);

  voiceConnectionErrorListener(guildId);
};

export const skipSong = async (guildId: string) => {
  const hasFollowingSong: songInterface[] = await getNextSongs(guildId);

  if (hasFollowingSong.length === 0) {
    remove(guildId, true);
    return;
  }

  await shiftSongs(guildId);
  await songPlayer(guildId);
};

export const remove = async (guildId: string, isFromSkip: boolean = false) => {
  if (isFromSkip) {
    await removeCurrentPlayingSong(guildId);
  } else {
    await emptyNextSongs(guildId);
  }

  killYtdlp(guildId);

  if (activePlayers[guildId]?.audioPlayer) {
    removeAllAudioPlayerListener(activePlayers[guildId].audioPlayer);
    activePlayers[guildId].audioPlayer.stop();
    delete activePlayers[guildId];
  }

  getVoiceConnection(guildId)?.disconnect();
  getVoiceConnection(guildId)?.destroy();
  getVoiceConnection(guildId)?.removeAllListeners();
  return;
};

export const pause = async (guildId: string) => {
  if (!activePlayers[guildId]) return;
  if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Playing) return;

  activePlayers[guildId].audioPlayer.pause();
};

export const resume = async (guildId: string) => {
  if (!activePlayers[guildId]) return;
  if (activePlayers[guildId].audioPlayer.state.status !== AudioPlayerStatus.Paused) return;

  activePlayers[guildId].audioPlayer.unpause();
};
