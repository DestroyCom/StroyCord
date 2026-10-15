import mongoose from 'mongoose';

// Per-guild configuration (/config). Kept apart from the Guild collection, whose runtime
// state is reset on every startup: nothing here is touched by that reset.
export const guild_settings_model = mongoose.model(
  'GuildSettings',
  new mongoose.Schema(
    {
      guildId: { type: String, required: true, unique: true },
      // null = instance default (.env)
      prefix: { type: String, default: null },
      language: { type: String, default: null },
      detectFromAllMessages: { type: Boolean, default: null },
      commandChannelIds: { type: [String], default: [] },
      maxQueueSize: { type: Number, default: null },
      maxSongsPerUser: { type: Number, default: 0 },
      statsEnabled: { type: Boolean, default: true },
      // null = answer in the channel of the command
      replyChannelId: { type: String, default: null },
      replyMessagesEnabled: { type: Boolean, default: true },
      commandMode: { type: String, enum: ['both', 'text', 'slash'], default: 'both' },
      blockedRoleIds: { type: [String], default: [] },
      updatedBy: { type: String, default: null },
      // Set when the bot leaves the guild; settings and stats are purged after a grace period
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
  )
);
