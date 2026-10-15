import mongoose from 'mongoose';

// One document per listened song (append-only), aggregated on demand by /stats
export const play_model = mongoose.model(
  'Play',
  new mongoose.Schema({
    guildId: { type: String, required: true },
    videoId: { type: String, required: true },
    title: { type: String, default: '' },
    videoAuthor: { type: String, default: '' },
    /** Length of the video, 0 for livestreams */
    durationSec: { type: Number, default: 0 },
    /** Time actually played, pauses excluded */
    listenedMs: { type: Number, required: true },
    requestedBy: {
      id: { type: String, required: true },
      username: { type: String, default: '' },
    },
    fromPlaylist: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  })
    .index({ guildId: 1, startedAt: -1 })
    .index({ guildId: 1, videoId: 1 })
    .index({ guildId: 1, 'requestedBy.id': 1 })
);
