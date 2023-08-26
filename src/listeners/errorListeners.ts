import { Client, Events, Guild } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { remove } from 'src/core/player';
import { emptyAllGuild, removeGuild } from 'src/database/queries/guilds/delete';

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

  client.on(Events.ShardDisconnect, () => {
    console.log('Bot deconnected');
  });

  client.on(Events.GuildDelete, async (guild: Guild) => {
    console.log(`Bot has been kicked from ${guild.name} (id:${guild.id})`);
    await remove(guild.id);
    await removeGuild(guild.id);
  });
};
