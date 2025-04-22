import { BG, BgConfig } from 'bgutils-js';
import { JSDOM } from 'jsdom';
import { Innertube, UniversalCache } from 'youtubei.js';

let innertubeInstance: Innertube | null = null;

export async function getInnertube(): Promise<Innertube> {
  console.log('Innertube instance:', innertubeInstance);
  if (innertubeInstance) return innertubeInstance;
  console.log('----------------');
  console.log('No Innertube instance found, creating a new one...');
  console.log('----------------');

  const tempInnertube = await Innertube.create({ retrieve_player: false });
  const visitorData = tempInnertube.session.context.client.visitorData;

  if (!visitorData) throw new Error('Impossible de récupérer visitorData');

  const dom = new JSDOM();
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });

  const requestKey = 'O43z0dpjhgX20SCx4KAo';

  const bgConfig: BgConfig = {
    fetch: (input: string | URL | globalThis.Request, init?: RequestInit) => fetch(input, init),
    globalObj: globalThis,
    identifier: visitorData,
    requestKey,
  };

  const bgChallenge = await BG.Challenge.create(bgConfig);
  if (!bgChallenge) throw new Error('Échec de la création du challenge BotGuard');

  const interpreterJavascript = bgChallenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (interpreterJavascript) {
    new Function(interpreterJavascript)();
  } else {
    throw new Error('Impossible de charger le script du challenge');
  }

  const poTokenResult = await BG.PoToken.generate({
    program: bgChallenge.program,
    globalName: bgChallenge.globalName,
    bgConfig,
  });

  console.log('PO Token:', poTokenResult.poToken);
  console.log('Visitor Data:', visitorData);
  console.log('BG Challenge:', bgChallenge);

  if (!poTokenResult.poToken) throw new Error('Impossible de récupérer le poToken');

  innertubeInstance = await Innertube.create({
    po_token: poTokenResult.poToken,
    visitor_data: visitorData,
    cache: new UniversalCache(true),
    generate_session_locally: true,
  });

  return innertubeInstance;
}
