import { TextBasedChannel } from 'discord.js';
import { noMusicCurrentlyPlayingEmbed, noPresenceInVoiceChannelEmbed } from 'src/utils/embeds/errorsEmbed';

export const authorNotInVoiceChannel = (textChannel: TextBasedChannel, commandTried: string) => {
  return textChannel.send({
    embeds: [noPresenceInVoiceChannelEmbed(commandTried)],
  });
};

export const noMusicCurrentlyPlaying = (textChannel: TextBasedChannel) => {
  return textChannel.send({
    embeds: [noMusicCurrentlyPlayingEmbed()],
  });
};
