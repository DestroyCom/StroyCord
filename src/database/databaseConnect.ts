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
  } catch (error) {
    console.log('Error connecting to database !');
    process.exit(0);
  }
};
