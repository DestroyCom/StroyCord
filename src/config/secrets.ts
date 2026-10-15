import dotenv from 'dotenv';

dotenv.config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  PREFIX = '&',
  DATABASE_CONNECTION_STRING,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME = 'stroycord',
  STROYCORD_LOGO = 'https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png',
  LANGUAGE = 'en-US',
  DETECT_FROM_ALL_MESSAGES,
  MAX_QUEUE_SIZE,
  TIMEZONE = 'Europe/Paris',
} = process.env;

if (!DISCORD_TOKEN) throw new Error('No token provided');

if (!DISCORD_CLIENT_ID) throw new Error('No client ID provided');

if (!PREFIX) throw new Error('No prefix provided');

if (!DATABASE_CONNECTION_STRING) throw new Error('No database URL provided');

if (!DATABASE_USER) throw new Error('No database user provided');

if (!DATABASE_PASSWORD) throw new Error('No database password provided');

if (!DATABASE_NAME) throw new Error('No database name provided');

if (!STROYCORD_LOGO) throw new Error('No logo provided');

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const secrets = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  PREFIX,
  DATABASE_CONNECTION_STRING,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  STROYCORD_LOGO,
  LANGUAGE,
  DETECT_FROM_ALL_MESSAGES: DETECT_FROM_ALL_MESSAGES === 'true',
  // Default queue limit for guilds that didn't set one with /config
  MAX_QUEUE_SIZE: Number.parseInt(MAX_QUEUE_SIZE ?? '', 10) || 100,
  // Used to compute the busiest hour in /stats
  TIMEZONE: isValidTimeZone(TIMEZONE) ? TIMEZONE : 'UTC',
};
