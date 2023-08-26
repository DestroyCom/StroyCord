import type * as I18nTypes from 'i18n-js';
import { I18n } from 'i18n-js/dist/require';

import * as enUS from './locales/en-US.json';
import * as frFR from './locales/fr-FR.json';

const parsedEnUS = JSON.parse(JSON.stringify(enUS));
const parsedFrFR = JSON.parse(JSON.stringify(frFR));

const i18n: I18nTypes.I18n = new I18n({
  'en-US': {
    ...parsedEnUS,
  },
  'fr-FR': {
    ...parsedFrFR,
  },
});

export default i18n;
