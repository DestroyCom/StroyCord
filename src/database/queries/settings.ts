import type { StoredSettings } from 'src/config/settings';
import { guild_settings_model } from 'src/database/schema/guildSettings';

export const findGuildSettings = async (guildId: string) => {
  return await guild_settings_model.findOne({ guildId }).lean();
};

export const saveGuildSettings = async (guildId: string, patch: Partial<StoredSettings>, updatedBy: string) => {
  return await guild_settings_model
    .findOneAndUpdate({ guildId }, { $set: { ...patch, updatedBy } }, { upsert: true, returnDocument: 'after' })
    .lean();
};

// Upsert so stats of a guild without settings also get purged later
export const markGuildLeft = async (guildId: string) => {
  return await guild_settings_model.updateOne({ guildId }, { $set: { deletedAt: new Date() } }, { upsert: true });
};

export const restoreGuilds = async (guildIds: string[]) => {
  return await guild_settings_model.updateMany(
    { guildId: { $in: guildIds }, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } }
  );
};

export const findGuildsLeftBefore = async (date: Date): Promise<string[]> => {
  return await guild_settings_model.distinct('guildId', { deletedAt: { $ne: null, $lte: date } });
};

export const deleteGuildSettings = async (guildIds: string[]) => {
  return await guild_settings_model.deleteMany({ guildId: { $in: guildIds } });
};
