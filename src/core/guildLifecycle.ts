import { captureError } from 'src/config/monitoring';
import { forgetGuildSettings } from 'src/core/settings';
import { deletePlays } from 'src/database/queries/plays';
import { deleteGuildSettings, findGuildsLeftBefore, markGuildLeft, restoreGuilds } from 'src/database/queries/settings';

// How long settings and stats are kept after the bot is removed from a guild (re-inviting it restores them)
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const onGuildLeft = async (guildId: string) => {
  forgetGuildSettings(guildId);
  await markGuildLeft(guildId);
};

/** Called for guilds the bot is (back) in: cancels a pending purge */
export const onGuildsJoined = async (guildIds: string[]) => {
  if (guildIds.length === 0) return;
  await restoreGuilds(guildIds);
};

export const purgeLeftGuilds = async (now = Date.now()) => {
  const guildIds = await findGuildsLeftBefore(new Date(now - RETENTION_MS));
  if (guildIds.length === 0) return 0;
  await deletePlays(guildIds);
  await deleteGuildSettings(guildIds);
  for (const guildId of guildIds) forgetGuildSettings(guildId);
  return guildIds.length;
};

const runPurge = () =>
  purgeLeftGuilds()
    .then((count) => {
      if (count > 0) console.log(`Purged settings and stats of ${count} guild(s) the bot left`);
    })
    .catch((error) => {
      console.error('[guildLifecycle] purge failed:', error);
      captureError(error, { step: 'purgeLeftGuilds' });
    });

export const startRetentionJob = () => {
  runPurge();
  setInterval(runPurge, PURGE_INTERVAL_MS).unref();
};
