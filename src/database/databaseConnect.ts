import mongoose from 'mongoose';

import { secrets } from '../config/secrets';
import { emptyAllGuild } from './queries/guilds/delete';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(secrets.DATABASE_CONNECTION_STRING, {
      dbName: secrets.DATABASE_NAME,
      authSource: 'admin',
      user: secrets.DATABASE_USER,
      pass: secrets.DATABASE_PASSWORD,
    });
    await emptyAllGuild();
  } catch (_error) {
    console.error('Error connecting to database !', _error);
    process.exit(1);
  }
};
