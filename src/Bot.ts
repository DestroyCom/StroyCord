// Must stay the first import: initialises GlitchTip before anything can throw
import './config/monitoring';

import { Client, GatewayIntentBits } from 'discord.js';

import { secrets } from './config/secrets';
import { connectToDatabase } from './database/databaseConnect';
import errorListeners from './listeners/errorListeners';
import interactionListener from './listeners/interactionListener';
import messageListener from './listeners/messageListener';
import ready from './listeners/ready';
import type { activePlayersInterface } from './utils/interfaces';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

export const activePlayers: activePlayersInterface = {};

const init = async () => {
  ready(client);
  errorListeners(client);
  messageListener(client);
  interactionListener(client);

  await connectToDatabase();

  client.login(secrets.DISCORD_TOKEN);
};

init();
