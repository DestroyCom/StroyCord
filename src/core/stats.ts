import type { AudioResource } from '@discordjs/voice';
import { captureError } from 'src/config/monitoring';
import { getGuildSettings } from 'src/core/settings';
import { insertPlay } from 'src/database/queries/plays';
import type { songInterface } from 'src/utils/interfaces';
import { extractVideoId } from 'src/utils/youtubeUtils';

// Shorter plays are failed starts or instant skips: they would skew "most played"
const MIN_LISTEN_MS = 5000;
// Below this share of the video, the song counts as skipped
const SKIP_THRESHOLD = 0.9;

// A resource can end through several paths (state change, then remove()): count it once
const recorded = new WeakSet<AudioResource>();

const recordPlay = async (guildId: string, resource: AudioResource<unknown>) => {
  if (recorded.has(resource)) return;
  recorded.add(resource);

  const song = resource.metadata as songInterface | undefined;
  const listenedMs = resource.playbackDuration;
  if (!song?.url || listenedMs < MIN_LISTEN_MS) return;
  if (!(await getGuildSettings(guildId)).statsEnabled) return;

  const durationSec = (song.minutes ?? 0) * 60 + (song.seconds ?? 0);
  const endedAt = new Date();
  await insertPlay({
    guildId,
    videoId: extractVideoId(song.url),
    title: song.title,
    videoAuthor: song.videoAuthor,
    durationSec,
    listenedMs,
    requestedBy: { id: song.requestAuthor.id, username: song.requestAuthor.username },
    fromPlaylist: song.isComingFromPlaylist,
    skipped: durationSec > 0 && listenedMs < durationSec * 1000 * SKIP_THRESHOLD,
    startedAt: new Date(endedAt.getTime() - listenedMs),
    endedAt,
  });
};

/** Records the end of a song in the background: stats must never break playback */
export const trackPlay = (guildId: string, resource: AudioResource<unknown> | undefined) => {
  if (!resource) return;
  recordPlay(guildId, resource).catch((error) => {
    console.error('[stats] failed to record play:', error);
    captureError(error, { guildId, step: 'recordPlay' });
  });
};
