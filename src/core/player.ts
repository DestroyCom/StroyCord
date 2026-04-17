import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import { activePlayers, client } from 'src/Bot';
import { sendErrorEmbed } from 'src/core/messages';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { getCurrentVoiceChannel, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import {
  createAudioPlayerListener,
  removeAllAudioPlayerListener,
  voiceConnectionErrorListener,
} from 'src/listeners/playerListeners';
import type { songInterface } from 'src/utils/interfaces';

// yt-dlp binary path managed by youtube-dl-exec (downloaded automatically on first use)
const YTDLP_BIN = join(
  dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

/**
 * Spawns yt-dlp and pipes its stdout directly to Discord's audio player.
 *
 * Why yt-dlp instead of youtubei.js download():
 * YouTube (2025) requires BotGuard-attested PoTokens for WEB client streaming.
 * Generating a valid BotGuard PoToken in Node.js without a real browser is not
 * possible — jsdom fails the APF runtime assertion. Alternative clients
 * (iOS, ANDROID, WEB_REMIX) all produce rqh=1 URLs that YouTube rejects when
 * fetched outside the expected client headers.
 *
 * yt-dlp handles YouTube authentication internally and is continuously updated
 * by the community to match YouTube's evolving restrictions. No PoToken
 * or cookie setup is required on our end.
 *
 * Note: youtube-dl-exec downloads the yt-dlp binary automatically on first run.
 */
function createYtdlpStream(url: string) {
  // spawn is safe: arguments are passed as an array (no shell, no injection)
  return spawn(YTDLP_BIN, [
    url,
    '--output',
    '-', // pipe audio to stdout
    '--format',
    'bestaudio', // best available audio-only format
    '--quiet',
    '--no-warnings',
  ]);
}

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

  const ytdlp = createYtdlpStream(nextSong.url);

  let stderrBuf = '';
  ytdlp.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  ytdlp.on('error', async (e) => {
    console.error('[player] yt-dlp spawn error:', e);
    await sendErrorEmbed(guildId, nextSong.requestChannel, `Failed to start playback for: **${nextSong.title}**`);
  });

  ytdlp.on('close', async (code) => {
    const msg = stderrBuf.trim();
    if (msg) console.error(`[player] yt-dlp: ${msg}`);
    if (code !== 0 && code !== null) {
      const reason = msg.includes('ERROR:') ? msg.split('ERROR:').pop()?.trim() : undefined;
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
