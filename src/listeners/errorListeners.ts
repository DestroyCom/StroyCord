import { type Client, Events, type Guild } from 'discord.js';
import { activePlayers } from 'src/Bot';
import { captureError } from 'src/config/monitoring';
import { onGuildLeft } from 'src/core/guildLifecycle';
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
    // Only emitted when the bot is really removed: outages emit GuildUnavailable instead
    console.log(`Bot has been kicked from ${guild.name} (id:${guild.id})`);
    await remove(guild.id);
    // Runtime state goes now, settings and stats are kept for a grace period in case the bot is re-invited
    await removeGuild(guild.id);
    await onGuildLeft(guild.id);
  });
};
