import { type Client, Events } from 'discord.js';
import { setActivity } from 'src/core/activityStatus';
import { onGuildsJoined, startRetentionJob } from 'src/core/guildLifecycle';
import { startHealthHeartbeat } from 'src/core/healthcheck';
import { initYoutubeClient } from 'src/core/youtube';
import { deployCommands } from 'src/deploy-commands';

export default (client: Client): void => {
  client.on(Events.ClientReady, async () => {
    if (!client.user || !client.application) {
      return;
    }

    startHealthHeartbeat(client);
    await initYoutubeClient();
    await setActivity(client);
    console.log(`${client.user.username} is online !`);

    const Guilds = client.guilds.cache.map((guild) => guild.id);
    await onGuildsJoined(Guilds);
    startRetentionJob();

    for (const guild of Guilds) {
      await deployCommands({ guildId: guild });
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    await onGuildsJoined([guild.id]);
    await deployCommands({ guildId: guild.id });
  });
};
