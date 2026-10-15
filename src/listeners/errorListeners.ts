import { type Client, Events, type Guild } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { captureError } from 'src/config/monitoring';
import { remove } from 'src/core/player';
import { emptyAllGuild, removeGuild } from 'src/database/queries/guilds/delete';

import { removeAllAudioPlayerListener } from './playerListeners';

export default (client: Client): void => {
  client.on(Events.Error, async (error) => {
    console.error('An error occured', error);
    captureError(error, { step: 'discordClient' });
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
