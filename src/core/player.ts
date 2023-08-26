import { createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { stream } from 'play-dl';
import { activePlayers, client } from 'src/Bot';
import { emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { getCurrentVoiceChannel, getFirstSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import { createAudioPlayerListener, removeAllAudioPlayerListener } from 'src/listeners/playerListerners';
import { songInterface } from 'src/utils/interfaces';

export const songPlayer = async (guildId: string) => {
  /* if (activePlayers[guildId] && activePlayers[guildId].audioPlayer) {
    removeAudioPlayerListener(activePlayers[guildId]?.audioPlayer);
  } */

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

  const source = await stream(nextSong.url);
  const audioStream = createAudioResource(source.stream, {
    inputType: source.type,
  });

  audioPlayer.play(audioStream);
  connection.subscribe(audioPlayer);
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
  removeAllAudioPlayerListener(activePlayers[guildId].audioPlayer);
  activePlayers[guildId].audioPlayer.stop();
  delete activePlayers[guildId];
  getVoiceConnection(guildId)?.disconnect();
  getVoiceConnection(guildId)?.destroy();
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
