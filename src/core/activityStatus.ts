import { Client } from 'discord.js';

export const setActivity = async (client: Client) => {
  if (!client.user || !client.application) {
    return;
  }

  return client.user.setActivity(
    `Currently playing music for ${client.guilds.cache.size} server${client.guilds.cache.size > 1 ? 's' : ''} !`
  );
};
