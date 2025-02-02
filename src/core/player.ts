import {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { activePlayers, client } from 'src/Bot';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { getCurrentVoiceChannel, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import { voiceConnectionErrorListener } from 'src/listeners/errorListeners';
import { createAudioPlayerListener, removeAllAudioPlayerListener } from 'src/listeners/playerListerners';
import { songInterface } from 'src/utils/interfaces';

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

  const stream = ytdl(nextSong.url, {
    quality: 'highestaudio',
    filter: 'audioonly',
    highWaterMark: 1 << 25,
  });

  const audioStream = createAudioResource(stream, {
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

  if (activePlayers[guildId] && activePlayers[guildId].audioPlayer) {
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
  if (activePlayers[guildId].audioPlayer.state.status !== 'playing') return;

  activePlayers[guildId].audioPlayer.pause();
};

export const resume = async (guildId: string) => {
  if (!activePlayers[guildId]) return;
  if (activePlayers[guildId].audioPlayer.state.status !== 'paused') return;

  activePlayers[guildId].audioPlayer.unpause();
};
