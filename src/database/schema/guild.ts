import mongoose from 'mongoose';

export const guild_model = mongoose.model(
  'Guild',
  new mongoose.Schema({
    guildId: {
      type: String,
      required: true,
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
