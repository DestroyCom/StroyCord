import { AudioPlayerStatus } from '@discordjs/voice';
import {
  PartialGroupDMChannel,
  PermissionFlagsBits,
  type TextBasedChannel,
  type User,
  type VoiceBasedChannel,
  type VoiceChannel,
} from 'discord.js';
import { activePlayers } from 'src/Bot';
import { getPrefix } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { authorNotInVoiceChannel, noMusicCurrentlyPlaying } from 'src/core/errors';
import { sendBotMessage } from 'src/core/messages';
import { pause, remove, resume, skipSong } from 'src/core/player';
import { playlistHandler } from 'src/core/requestHandlers/playlistRequest';
import { searchSong } from 'src/core/requestHandlers/searchRequest';
import { songRequest } from 'src/core/requestHandlers/songRequest';
import { getFirstSong, getLastPlayedSong, getNextSongs, getQueuedPlaylists } from 'src/database/queries/guilds/get';
import { prioritizeSong, removePlaylistSongs, shiftSongs } from 'src/database/queries/guilds/update';
import { missingRequiredArgument, unknownError, unreconizedArgumentEmbed } from 'src/utils/embeds/errorsEmbed';
import { queueEmbed } from 'src/utils/embeds/listSongEmbed';
import {
  choosePlaylistEmbed,
  pauseEmbed,
  playlistClearedEmbed,
  prioritizedEmbed,
  removeEmbed,
  resumeEmbed,
  skipEmbed,
} from 'src/utils/embeds/playerEmbeds';
import { nowPlayingEmbed } from 'src/utils/embeds/songEmbed';
import type { songInterface } from 'src/utils/interfaces';
import { parseSoundcloudUrl } from 'src/utils/soundcloudUtils';
import { yt_validate } from 'src/utils/youtubeUtils';

export const playCommand = (
  splittedMessage: string[],
  guildId: string,
  textChannel: TextBasedChannel,
  requestAuthor: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (
    !checkCommandUsability(
      guildId,
      textChannel,
      voiceChannel as VoiceChannel,
      i18n.t('commandContext.startAPlay'),
      false
    )
  )
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const request = splittedMessage.slice(1).join(' ');
  const requestType = yt_validate(request);
  const soundcloud = parseSoundcloudUrl(request);

  if (request === '' && !(textChannel instanceof PartialGroupDMChannel))
    return textChannel.send({ embeds: [missingRequiredArgument()] });

  if (soundcloud?.type === 'track') {
    songRequest(soundcloud.url, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (soundcloud) {
    // A set, or a short link: the playlist handler falls back to a single track when it is one
    playlistHandler(soundcloud.url, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (request.startsWith('https') && requestType === 'video') {
    songRequest(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (request.startsWith('https') && requestType === 'playlist') {
    playlistHandler(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (requestType === 'search') {
    searchSong(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else {
    if (request.startsWith('https://www.youtube.com/live/')) {
      songRequest(request, guildId, requestAuthor, textChannel.id, voiceChannel);
    } else {
      if (textChannel instanceof PartialGroupDMChannel) return;
      return textChannel.send({
        embeds: [unreconizedArgumentEmbed()],
      });
    }
  }
};

export const skipCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.skipAPlay')))
    return;

  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  await skipSong(guildId);

  const nextSongs = await getNextSongs(guildId);

  if (nextSongs.length !== 0) {
    await sendBotMessage(guildId, textChannel.id, await skipEmbed(author, guildId), 'announce');
  }
};

export const pauseCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.stopAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const guildPlayerState = activePlayers[guildId].audioPlayer.state.status;

  if (guildPlayerState === AudioPlayerStatus.Playing || guildPlayerState === AudioPlayerStatus.Buffering) {
    await pause(guildId);
    await sendBotMessage(guildId, textChannel.id, pauseEmbed(author), 'announce');
  } else {
    if (textChannel instanceof PartialGroupDMChannel) return;
    textChannel.send({
      embeds: [unknownError(i18n.t('commandContext.unableToPause'))],
    });
  }
};

export const resumeCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.resumeAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const guildPlayerState = activePlayers[guildId].audioPlayer.state.status;

  if (guildPlayerState === AudioPlayerStatus.Paused || guildPlayerState === AudioPlayerStatus.AutoPaused) {
    await resume(guildId);
    await sendBotMessage(guildId, textChannel.id, resumeEmbed(author), 'announce');
  } else {
    if (textChannel instanceof PartialGroupDMChannel) return;
    textChannel.send({
      embeds: [unknownError(i18n.t('commandContext.unableToResume'))],
    });
  }
};

export const queueCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  _author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.queueAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const nextSongs = await getNextSongs(guildId);
  await sendBotMessage(guildId, textChannel.id, await queueEmbed(nextSongs), 'info');
};

export const removeCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.clearAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  await shiftSongs(guildId);
  await remove(guildId);
  await sendBotMessage(guildId, textChannel.id, removeEmbed(author), 'announce');
};

export const currentCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.clearAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const currentSong = await getFirstSong(guildId);
  await sendBotMessage(guildId, textChannel.id, nowPlayingEmbed(currentSong), 'info');
};

export const redoCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  requestAuthor: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (
    !checkCommandUsability(
      guildId,
      textChannel,
      voiceChannel as VoiceChannel,
      i18n.t('commandContext.startAPlay'),
      false
    )
  )
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const lastPlayedSong = await getLastPlayedSong(guildId);

  songRequest(lastPlayedSong.url, guildId, requestAuthor, textChannel.id, voiceChannel);
};

/**
 * Removes the waiting songs of a playlist (the song playing continues).
 * `selector`: a playlist id (slash autocomplete) or its number in the list; optional when only one is waiting.
 */
export const clearPlaylistCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel?: VoiceBasedChannel | null,
  selector?: string
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.editQueue')))
    return;

  const playlists = await getQueuedPlaylists(guildId);
  if (playlists.length === 0) {
    await sendBotMessage(guildId, textChannel.id, unknownError(i18n.t('queueTools.noPlaylist')), 'error');
    return;
  }

  const index = selector && /^\d+$/.test(selector) ? Number(selector) - 1 : -1;
  const playlist =
    playlists.find(({ id }) => id === selector) ??
    playlists[index] ??
    (!selector && playlists.length === 1 ? playlists[0] : undefined);
  if (!playlist) {
    await sendBotMessage(guildId, textChannel.id, choosePlaylistEmbed(playlists), 'info');
    return;
  }

  const removed = await removePlaylistSongs(guildId, playlist.id);
  await sendBotMessage(guildId, textChannel.id, playlistClearedEmbed(author, playlist, removed), 'announce');
};

/** Moves the song at `position` (as numbered by the queue command) right after the one playing */
export const priorityCommand = async (
  guildId: string,
  textChannel: TextBasedChannel,
  author: User,
  voiceChannel: VoiceBasedChannel | null | undefined,
  position: string | undefined
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.editQueue')))
    return;

  const waiting = (await getNextSongs(guildId)) as songInterface[];
  if (waiting.length === 0) {
    await sendBotMessage(guildId, textChannel.id, unknownError(i18n.t('queueTools.emptyQueue')), 'error');
    return;
  }

  const song = position && /^\d+$/.test(position) ? waiting[Number(position) - 1] : undefined;
  if (!song?.queueId) {
    const error = i18n.t('queueTools.invalidPosition', { max: waiting.length, command: `\`${getPrefix()}q\`` });
    await sendBotMessage(guildId, textChannel.id, unknownError(error), 'error');
    return;
  }

  // Targets the song by id: if the queue moved since it was read, the right song still moves
  const moved = await prioritizeSong(guildId, song.queueId);
  if (!moved) {
    await sendBotMessage(guildId, textChannel.id, unknownError(i18n.t('queueTools.notWaiting')), 'error');
    return;
  }
  await sendBotMessage(guildId, textChannel.id, prioritizedEmbed(author, moved), 'announce');
};

const hasPermission = (voiceChannel: VoiceChannel, textChannel: TextBasedChannel) => {
  const isAuthorized = false;

  const retreivePermission = voiceChannel.permissionsFor(textChannel.client.user);

  if (!retreivePermission?.has(PermissionFlagsBits.Connect) || !retreivePermission?.has(PermissionFlagsBits.Speak)) {
    if (textChannel instanceof PartialGroupDMChannel) return;

    textChannel.send({
      embeds: [unknownError(i18n.t('botBehaviour.needPermission'))],
    });

    return isAuthorized;
  }

  return !isAuthorized;
};

const checkCommandUsability = (
  guildId: string,
  textChannel: TextBasedChannel,
  voiceChannel: VoiceChannel,
  contextMessage: string,
  checkifMusicIsPlaying: boolean = true
) => {
  if (!voiceChannel) {
    authorNotInVoiceChannel(textChannel, contextMessage);
    return false;
  }

  if (!activePlayers[guildId] && checkifMusicIsPlaying) {
    noMusicCurrentlyPlaying(textChannel);
    return false;
  }

  return true;
};
