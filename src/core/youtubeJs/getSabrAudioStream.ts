import GoogleVideo, { Format } from 'googlevideo';
import { PassThrough, Readable } from 'stream';

import { getInnertube } from './generateInnertubeClient';

export async function getSabrAudioStream(videoId: string): Promise<Readable> {
  const youtube = await getInnertube();
  const info = await youtube.getBasicInfo(videoId);

  if (info.playability_status?.status !== 'OK') {
    throw new Error(`Video not playable: ${info.playability_status?.status}`);
  }

  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  const audioFormat: Format = {
    itag: format.itag,
    lastModified: format.last_modified_ms,
    xtags: format.xtags,
  };

  const serverAbrStreamingUrl = youtube.session.player?.decipher(info.page[0].streaming_data?.server_abr_streaming_url);
  const videoPlaybackUstreamerConfig =
    info.page[0].player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config;

  if (!serverAbrStreamingUrl || !videoPlaybackUstreamerConfig) {
    throw new Error('Streaming URL or ustreamer config missing');
  }

  const stream = new PassThrough();

  const serverAbrStream = new GoogleVideo.ServerAbrStream({
    fetch: youtube.session.http.fetch_function,
    serverAbrStreamingUrl,
    videoPlaybackUstreamerConfig,
    durationMs: (info.basic_info?.duration ?? 0) * 1000,
    poToken: youtube.session.po_token,
  });

  serverAbrStream.on('data', (chunkData) => {
    for (const formatData of chunkData.initializedFormats) {
      if (formatData.mimeType?.includes('audio')) {
        for (const chunk of formatData.mediaChunks) {
          stream.write(chunk);
        }
      }
    }
  });

  serverAbrStream.on('end', () => stream.end());
  serverAbrStream.on('error', (err) => stream.destroy(err));

  await serverAbrStream.init({
    audioFormats: [audioFormat],
    videoFormats: [],
    clientAbrState: {
      playerTimeMs: 0,
      enabledTrackTypesBitfield: 1, // audio only
    },
  });

  //console.log('Stream initialized');
  return stream;
}
