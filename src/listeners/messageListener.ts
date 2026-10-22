import { type Client, DiscordAPIError, Events, type Message } from 'discord.js';
import {
  clearPlaylistCommand,
  currentCommand,
  pauseCommand,
  playCommand,
  priorityCommand,
  queueCommand,
  redoCommand,
  removeCommand,
  resumeCommand,
  skipCommand,
} from 'src/commands/textCommands';
import { runWithSettings } from 'src/config/guildContext';
import { captureError } from 'src/config/monitoring';
import { acceptsTextCommands, isChannelAllowed, isMemberBlocked } from 'src/config/settings';
import { getGuildSettings } from 'src/core/settings';
import { fetchGuild } from 'src/database/queries/guilds/get';
import { unknownRequestEmbed } from 'src/utils/embeds/errorsEmbed';
import { messageFormater } from 'src/utils/messageUtils';
import { parseSoundcloudUrl } from 'src/utils/soundcloudUtils';
import { yt_validate } from 'src/utils/youtubeUtils';

const isMusicLink = (content: string) => {
  const trimmed = content.trim();
  if (!/^https?:\/\//.test(trimmed)) return false;
  if (parseSoundcloudUrl(trimmed)) return true;
  const type = yt_validate(trimmed);
  return type === 'video' || type === 'playlist';
};

const handleTextCommand = async (message: Message<true>, prefix: string, isBareLink: boolean) => {
  const guild = await fetchGuild(message.guildId);
  const voiceChannel = message.member?.voice.channel;
  const textChannel = message.channel;
  let { command, splittedMessage } = messageFormater(message.content, prefix);

  if (isBareLink) {
    command = 'play';
    splittedMessage = ['play', message.content.trim()];
  }

  let handled = true;
  switch (command) {
    case 'play':
    case 'p':
      playCommand(splittedMessage, guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'skip':
    case 's':
      skipCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'fuckoff':
    case 'fo':
      removeCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'pause':
    case 'pa':
      pauseCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'resume':
    case 're':
      resumeCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'queue':
    case 'q':
      queueCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'c':
    case 'current':
      currentCommand(guild.guildId, textChannel, voiceChannel);
      break;
    case 'redo':
      redoCommand(guild.guildId, textChannel, message.author, voiceChannel);
      break;
    case 'clearplaylist':
    case 'cp':
      clearPlaylistCommand(guild.guildId, textChannel, message.author, voiceChannel, splittedMessage[1]);
      break;
    case 'priority':
    case 'pr':
      priorityCommand(guild.guildId, textChannel, message.author, voiceChannel, splittedMessage[1]);
      break;
    default:
      handled = false;
      message.channel.send({
        embeds: [unknownRequestEmbed()],
      });
      break;
  }

  if (handled) {
    setTimeout(() => {
      message.delete().catch((error: unknown) => {
        if (error instanceof DiscordAPIError && (error.code === 10008 || error.code === 50013)) return;
        console.error(`[messageListener] Failed to delete message ${message.id}:`, error);
      });
    }, 1000);
  }
};

export default (client: Client): void => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;

    try {
      const settings = await getGuildSettings(message.guildId);
      const hasPrefix = message.content.startsWith(settings.prefix);
      // Without the prefix, only a bare YouTube / SoundCloud link is a request (and only if the guild enabled it)
      const isBareLink = !hasPrefix && settings.detectFromAllMessages && isMusicLink(message.content);
      // In slash mode, prefix commands are ignored silently (bare links keep their own toggle)
      const isPrefixCommand = hasPrefix && acceptsTextCommands(settings);
      if (!isPrefixCommand && !isBareLink) return;
      // Outside the allowed channels, stay silent: answering would be the flood the restriction prevents
      if (!isChannelAllowed(settings, message.channelId, message.channel.parentId)) return;
      // Blocked members are ignored, without any answer
      if (isMemberBlocked(settings, message.member?.roles.cache.keys() ?? [])) return;

      await runWithSettings(settings, () => handleTextCommand(message, settings.prefix, isBareLink));
    } catch (error) {
      console.error('[messageListener] failed to handle message:', error);
      captureError(error, { guildId: message.guildId, step: 'messageCreate' });
    }
  });
};
