import { getVideoIdFromUrl } from 'src/utils/utils';

import { getInnertube } from './generateInnertubeClient';

export async function fetchVideoInfo(videoUrl: string) {
  const yt = await getInnertube();

  const id = getVideoIdFromUrl(videoUrl);

  if (!id) {
    throw new Error('Cannot retrieve video ID');
  }

  const info = await yt.getInfo(id);

  return info;
}
