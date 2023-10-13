import { REST, Routes } from 'discord.js';

import { commands } from './commands/slashCommands';
import { secrets } from './config/secrets';

type DeployCommandsProps = {
  guildId: string;
};

const commandsData = Object.values(commands).map((command) => command.data);

const rest = new REST({ version: '10' }).setToken(secrets.DISCORD_TOKEN);

export async function deployCommands({ guildId }: DeployCommandsProps) {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(secrets.DISCORD_CLIENT_ID.toString(), guildId), {
      body: commandsData,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
