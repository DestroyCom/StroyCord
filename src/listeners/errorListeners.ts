import { getVoiceConnection } from '@discordjs/voice';
import { Client, Events, Guild } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { remove } from 'src/core/player';
import { emptyAllGuild, removeGuild } from 'src/database/queries/guilds/delete';
import { shiftSongs } from 'src/database/queries/guilds/update';

import { removeAllAudioPlayerListener } from './playerListerners';

export default (client: Client): void => {
  client.on(Events.Error, async () => {
    console.log('An error occured');
    await emptyAllGuild();
    //Remove all listerners from all audio players
    for (const guildId in activePlayers) {
      await removeAllAudioPlayerListener(activePlayers[guildId].audioPlayer);
      await remove(guildId);
    }
  });

  client.on(Events.GuildDelete, async (guild: Guild) => {
    console.log(`Bot has been kicked from ${guild.name} (id:${guild.id})`);
    await remove(guild.id);
    await removeGuild(guild.id);
  });
};

export const voiceConnectionErrorListener = (guildId: string) => {
  getVoiceConnection(guildId)?.on('error', async () => {
    console.log(`An error occured in voice connection for guild ${guildId}`);
    await remove(guildId);
  });

  getVoiceConnection(guildId)?.on('stateChange', async (_, newState) => {
    if (newState.status === 'disconnected') {
      console.log(`Voice connection has been destroyed for guild ${guildId}`);
      await shiftSongs(guildId);
      await remove(guildId);
    }
  });
};
