import { Innertube, Log } from 'youtubei.js';

// youtubei.js warns loudly about every unknown YouTube node (PlayerInterstitial, …).
// These are harmless for the metadata we read — only keep real errors.
Log.setLevel(Log.Level.ERROR);

export let youtubeClient!: Innertube;

export async function initYoutubeClient(): Promise<void> {
  youtubeClient = await Innertube.create({ retrieve_player: false });
  console.log('[youtube] client ready');
}
