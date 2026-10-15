import mongoose from 'mongoose';

import { secrets } from '../config/secrets';
import { emptyAllGuild, removeDuplicateGuilds } from './queries/guilds/delete';
import { guild_model } from './schema/guild';
import { guild_settings_model } from './schema/guildSettings';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(secrets.DATABASE_CONNECTION_STRING, {
      dbName: secrets.DATABASE_NAME,
      authSource: 'admin',
      user: secrets.DATABASE_USER,
      pass: secrets.DATABASE_PASSWORD,
      // Indexes are built below, once duplicates that would break the unique ones are gone
      autoIndex: false,
    });
    const removed = await removeDuplicateGuilds();
    if (removed > 0) console.log(`Removed ${removed} duplicate guild document(s)`);
    await Promise.all([guild_model, guild_settings_model].map((model) => model.createIndexes()));
    // Only runtime state (queue, voice channel) is reset: settings and stats live in their own collections
    await emptyAllGuild();
  } catch (_error) {
    console.error('Error connecting to database !', _error);
    process.exit(1);
  }
};
