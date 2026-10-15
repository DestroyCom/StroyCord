import type * as I18nTypes from 'i18n-js';
import { I18n } from 'i18n-js/dist/require';

import { getContextSettings } from './guildContext';
import * as enUS from './locales/en-US.json';
import * as frFR from './locales/fr-FR.json';

const parsedEnUS = JSON.parse(JSON.stringify(enUS));
const parsedFrFR = JSON.parse(JSON.stringify(frFR));

const translator: I18nTypes.I18n = new I18n({
  'en-US': {
    ...parsedEnUS,
  },
  'fr-FR': {
    ...parsedFrFR,
  },
});
translator.defaultLocale = 'en-US';
translator.enableFallback = true;

// Never mutate translator.locale: guilds are handled concurrently, the language comes from the guild context
const i18n = {
  t: (scope: string, options?: I18nTypes.TranslateOptions): string =>
    translator.t(scope, { locale: getContextSettings().language, ...options }),
};

export default i18n;
