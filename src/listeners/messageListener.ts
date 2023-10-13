import { Client, Events } from 'discord.js';
import { yt_validate } from 'play-dl';
import {
  currentCommand,
  pauseCommand,
  playCommand,
  queueCommand,
  redoCommand,
  removeCommand,
  resumeCommand,
  skipCommand,
} from 'src/commands/textCommands';
import { secrets } from 'src/config/secrets';
import { fetchGuild } from 'src/database/queries/guilds/get';
import { unknownRequestEmbed } from 'src/utils/embeds/errorsEmbed';
import { messageFormater } from 'src/utils/utils';

export default (client: Client): void => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!secrets.DETECT_FROM_ALL_MESSAGES && !message.content.startsWith(secrets.PREFIX)) return;

    const guild = await fetchGuild(message.guildId!);
    const voiceChannel = message.member?.voice.channel;
    const textChannel = message.channel;
    let { command, splittedMessage } = messageFormater(message.content);

    if (yt_validate(message.content) && !message.content.startsWith(secrets.PREFIX)) {
      command = 'play';
      splittedMessage = ['play', message.content];
    }

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
      default:
        message.channel.send({
          embeds: [unknownRequestEmbed()],
        });
        break;
    }

    setTimeout(() => {
      message.delete();
    }, 1000);
  });
};
