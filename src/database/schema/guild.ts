import mongoose from 'mongoose';

// Songs kept in previouslyPlayedSongs (used by /redo); older entries are dropped
export const HISTORY_SIZE = 50;

export const guild_model = mongoose.model(
  'Guild',
  new mongoose.Schema({
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    registeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    currentVoiceChannel: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: null,
    },

    previouslyPlayedSongs: {
      type: [mongoose.Schema.Types.Mixed],
      required: false,
      default: [],
    },
    nextSongs: {
      type: [mongoose.Schema.Types.Mixed],
      required: false,
      default: [],
    },
  })
);
