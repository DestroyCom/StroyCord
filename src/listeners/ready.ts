import { Client, Events } from 'discord.js';
import { setActivity } from 'src/core/activityStatus';
import { deployCommands } from 'src/deploy-commands';

export default (client: Client): void => {
  client.on(Events.ClientReady, async () => {
    if (!client.user || !client.application) {
      return;
    }

    await setActivity(client);
    console.log(`${client.user.username} is online !`);

    const Guilds = client.guilds.cache.map((guild) => guild.id);

    for (const guild of Guilds) {
      await deployCommands({ guildId: guild });
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
  });
};
