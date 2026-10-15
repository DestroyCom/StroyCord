import { REST, Routes } from 'discord.js';

import { commands } from './commands/slashCommands';
import { secrets } from './config/secrets';
import { isSlashCommandEnabled } from './config/settings';
import { getGuildSettings } from './core/settings';

type DeployCommandsProps = {
  guildId: string;
};

const rest = new REST({ version: '10' }).setToken(secrets.DISCORD_TOKEN);

/** Deploys the guild's slash commands, without those its command mode disables (redeploy when it changes) */
export async function deployCommands({ guildId }: DeployCommandsProps) {
  try {
    console.log('Started refreshing application (/) commands.');

    const settings = await getGuildSettings(guildId);
    const commandsData = Object.values(commands)
      .filter((command) => isSlashCommandEnabled(settings, command.data.name))
      .map((command) => command.data);

    await rest.put(Routes.applicationGuildCommands(secrets.DISCORD_CLIENT_ID.toString(), guildId), {
      body: commandsData,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
