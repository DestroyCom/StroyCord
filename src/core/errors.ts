import { PartialGroupDMChannel, TextBasedChannel } from 'discord.js';
import { noMusicCurrentlyPlayingEmbed, noPresenceInVoiceChannelEmbed } from 'src/utils/embeds/errorsEmbed';

export const authorNotInVoiceChannel = (textChannel: TextBasedChannel, commandTried: string) => {
  if (textChannel instanceof PartialGroupDMChannel) return;
  return textChannel.send({
    embeds: [noPresenceInVoiceChannelEmbed(commandTried)],
  });
};

export const noMusicCurrentlyPlaying = (textChannel: TextBasedChannel) => {
  if (textChannel instanceof PartialGroupDMChannel) return;
  return textChannel.send({
    embeds: [noMusicCurrentlyPlayingEmbed()],
  });
};
