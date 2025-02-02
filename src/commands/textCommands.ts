import { AudioPlayerStatus } from '@discordjs/voice';
import {
  PartialGroupDMChannel,
  PermissionFlagsBits,
  TextBasedChannel,
  User,
  VoiceBasedChannel,
  VoiceChannel,
} from 'discord.js';
import { activePlayers } from 'src/Bot';
import i18n from 'src/config/i18n';
import { authorNotInVoiceChannel, noMusicCurrentlyPlaying } from 'src/core/errors';
import { pause, remove, resume, skipSong } from 'src/core/player';
import { playlistHandler } from 'src/core/requestHandlers/playlistRequest';
import { searchSong } from 'src/core/requestHandlers/searchRequest';
import { songRequest } from 'src/core/requestHandlers/songRequest';
import { getFirstSong, getLastPlayedSong, getNextSongs } from 'src/database/queries/guilds/get';
import { shiftSongs } from 'src/database/queries/guilds/update';
import { missingRequiredArgument, unknownError, unreconizedArgumentEmbed } from 'src/utils/embeds/errorsEmbed';
import { queueEmbed } from 'src/utils/embeds/listSongEmbed';
import { pauseEmbed, removeEmbed, resumeEmbed, skipEmbed } from 'src/utils/embeds/playerEmbeds';
import { nowPlayingEmbed } from 'src/utils/embeds/songEmbed';
import { yt_validate } from 'src/utils/utils';

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

  if (request === '' && !(textChannel instanceof PartialGroupDMChannel))
    return textChannel.send({ embeds: [missingRequiredArgument()] });

  if (request.startsWith('https') && requestType === 'video') {
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

  if (nextSongs.length != 0) {
    if (textChannel instanceof PartialGroupDMChannel) return;
    await textChannel.send({
      embeds: [await skipEmbed(author, guildId)],
    });
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

    if (textChannel instanceof PartialGroupDMChannel) return;
    textChannel.send({ embeds: [pauseEmbed(author)] });
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
    if (textChannel instanceof PartialGroupDMChannel) return;
    textChannel.send({
      embeds: [resumeEmbed(author)],
    });
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
  author: User,
  voiceChannel?: VoiceBasedChannel | null
) => {
  if (!checkCommandUsability(guildId, textChannel, voiceChannel as VoiceChannel, i18n.t('commandContext.queueAPlay')))
    return;
  if (!hasPermission(voiceChannel as VoiceChannel, textChannel)) return;

  const nextSongs = await getNextSongs(guildId);

  if (textChannel instanceof PartialGroupDMChannel) return;
  textChannel.send({
    embeds: [await queueEmbed(nextSongs)],
  });
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

  if (textChannel instanceof PartialGroupDMChannel) return;
  textChannel.send({
    embeds: [removeEmbed(author)],
  });
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

  if (textChannel instanceof PartialGroupDMChannel) return;
  textChannel.send({
    embeds: [nowPlayingEmbed(currentSong)],
  });
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
