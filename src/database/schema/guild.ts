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
      default: Date.now(),
    },

    currentVoiceChannel: {
      type: Object,
      required: false,
      default: null,
    },

    previouslyPlayedSongs: {
      type: Array,
      required: false,
      default: [],
    },
    nextSongs: {
      type: Array,
      required: false,
      default: [],
    },
  })
);
