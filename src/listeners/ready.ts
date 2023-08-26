import { Client, Events } from 'discord.js';
import { setActivity } from 'src/core/activityStatus';

export default (client: Client): void => {
  client.on(Events.ClientReady, async () => {
    if (!client.user || !client.application) {
      return;
    }

    await setActivity(client);
    console.log(`${client.user.username} is online !`);
  });
};
