import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'en-US', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));

import { getPrefix, runWithSettings } from 'src/config/guildContext';
import i18n from 'src/config/i18n';
import { resolveSettings } from 'src/config/settings';

const fr = { ...resolveSettings(), language: 'fr-FR' as const, prefix: '!' };
const en = { ...resolveSettings(), language: 'en-US' as const, prefix: '?' };
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('guild context', () => {
  it('uses the instance defaults outside of a guild context', () => {
    expect(i18n.t('global.understood')).toBe('Understood');
    expect(getPrefix()).toBe('&');
  });

  it('keeps each guild language and prefix across concurrent awaits', async () => {
    const [a, b] = await Promise.all([
      runWithSettings(fr, async () => {
        await tick();
        return [i18n.t('global.understood'), getPrefix()];
      }),
      runWithSettings(en, async () => {
        await tick();
        return [i18n.t('global.understood'), getPrefix()];
      }),
    ]);
    expect(a).toEqual(['Compris', '!']);
    expect(b).toEqual(['Understood', '?']);
  });
});
