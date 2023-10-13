import { AudioPlayerStatus } from '@discordjs/voice';
import { PermissionFlagsBits, TextBasedChannel, User, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import { yt_validate } from 'play-dl';
import { activePlayers } from 'src/Bot';
import i18n from 'src/config/i18n';
import { authorNotInVoiceChannel, noMusicCurrentlyPlaying } from 'src/core/errors';
import { pause, remove, resume, skipSong } from 'src/core/player';
import { playlistHandler } from 'src/core/requestHandlers/playlistRequest';
import { searchSong } from 'src/core/requestHandlers/searchRequest';
import { songRequest } from 'src/core/requestHandlers/songRequest';
import { getNextSongs } from 'src/database/queries/guilds/get';
import { missingRequiredArgument, unknownError, unreconizedArgumentEmbed } from 'src/utils/embeds/errorsEmbed';
import { queueEmbed } from 'src/utils/embeds/listSongEmbed';
import { pauseEmbed, removeEmbed, resumeEmbed, skipEmbed } from 'src/utils/embeds/playerEmbeds';

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

  if (request === '') return textChannel.send({ embeds: [missingRequiredArgument()] });

  if (requestType === 'video') {
    songRequest(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (requestType === 'playlist') {
    playlistHandler(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else if (requestType === 'search') {
    searchSong(request, guildId, requestAuthor, textChannel.id, voiceChannel);
  } else {
    return textChannel.send({
      embeds: [unreconizedArgumentEmbed()],
    });
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

    textChannel.send({ embeds: [pauseEmbed(author)] });
  } else {
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
    textChannel.send({
      embeds: [resumeEmbed(author)],
    });
  } else {
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

  await remove(guildId);

  textChannel.send({
    embeds: [removeEmbed(author)],
  });
};

const hasPermission = (voiceChannel: VoiceChannel, textChannel: TextBasedChannel) => {
  const isAuthorized = false;

  const retreivePermission = voiceChannel.permissionsFor(textChannel.client.user);

  if (!retreivePermission?.has(PermissionFlagsBits.Connect) || !retreivePermission?.has(PermissionFlagsBits.Speak)) {
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
