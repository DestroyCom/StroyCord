import { describe, expect, it } from 'vitest';

import enUS from 'src/config/locales/en-US.json';
import frFR from 'src/config/locales/fr-FR.json';

/**
 * Tests for locale key restructuring introduced in this PR:
 * voiceChannelNotFound, textChannelNotFound, guildNotFound, and queryNotFound
 * were moved from embedsText.errors.* to embedsText.errors.arguments.* so they
 * match the paths referenced by slash commands.
 */

describe('en-US locale – errors.arguments key paths', () => {
  const args = enUS.embedsText.errors.arguments as Record<string, unknown>;
  const errors = enUS.embedsText.errors as Record<string, unknown>;

  it('has voiceChannelNotFound under errors.arguments', () => {
    expect(args.voiceChannelNotFound).toBe('The voice channel was not found');
  });

  it('has textChannelNotFound under errors.arguments', () => {
    expect(args.textChannelNotFound).toBe('The text channel was not found');
  });

  it('has guildNotFound under errors.arguments', () => {
    expect(args.guildNotFound).toBe('The guild was not found');
  });

  it('has queryNotFound under errors.arguments', () => {
    expect(args.queryNotFound).toBe('The query was not found');
  });

  it('does NOT have voiceChannelNotFound at the old errors root path', () => {
    expect(errors.voiceChannelNotFound).toBeUndefined();
  });

  it('does NOT have textChannelNotFound at the old errors root path', () => {
    expect(errors.textChannelNotFound).toBeUndefined();
  });

  it('does NOT have guildNotFound at the old errors root path', () => {
    expect(errors.guildNotFound).toBeUndefined();
  });

  it('does NOT have queryNotFound at the old errors root path', () => {
    expect(errors.queryNotFound).toBeUndefined();
  });

  it('still has the existing arguments.unknown key (regression guard)', () => {
    const unknown = args.unknown as { title: string; description: string } | undefined;
    expect(unknown?.title).toBe('Unknown Argument');
  });

  it('still has the existing arguments.missing key (regression guard)', () => {
    const missing = args.missing as { title: string; description: string } | undefined;
    expect(missing?.title).toBe('Missing Argument');
  });

  it('still has errors.unknown at the top-level errors object', () => {
    const unknown = errors.unknown as { title: string } | undefined;
    expect(unknown?.title).toBe('AN ERROR OCCURRED');
  });
});

describe('fr-FR locale – errors.arguments key paths', () => {
  const args = frFR.embedsText.errors.arguments as Record<string, unknown>;
  const errors = frFR.embedsText.errors as Record<string, unknown>;

  it('has voiceChannelNotFound under errors.arguments', () => {
    expect(args.voiceChannelNotFound).toBe("Le salon vocal n'as pas été trouvé");
  });

  it('has textChannelNotFound under errors.arguments', () => {
    expect(args.textChannelNotFound).toBe("Le salon textuel n'as pas été trouvé");
  });

  it('has guildNotFound under errors.arguments', () => {
    expect(args.guildNotFound).toBe("Le serveur n'as pas été trouvé");
  });

  it('has queryNotFound under errors.arguments', () => {
    expect(args.queryNotFound).toBe('Aucune recherche specifiée');
  });

  it('does NOT have voiceChannelNotFound at the old errors root path', () => {
    expect(errors.voiceChannelNotFound).toBeUndefined();
  });

  it('does NOT have textChannelNotFound at the old errors root path', () => {
    expect(errors.textChannelNotFound).toBeUndefined();
  });

  it('does NOT have guildNotFound at the old errors root path', () => {
    expect(errors.guildNotFound).toBeUndefined();
  });

  it('does NOT have queryNotFound at the old errors root path', () => {
    expect(errors.queryNotFound).toBeUndefined();
  });

  it('still has the existing arguments.unknown key (regression guard)', () => {
    const unknown = args.unknown as { title: string } | undefined;
    expect(unknown?.title).toBe('Argument non reconnu');
  });

  it('still has the existing arguments.missing key (regression guard)', () => {
    const missing = args.missing as { title: string } | undefined;
    expect(missing?.title).toBe('Argument manquant');
  });

  it('still has errors.unknown at the top-level errors object', () => {
    const unknown = errors.unknown as { title: string } | undefined;
    expect(unknown?.title).toBe('UNE ERREUR S\'EST PRODUITE');
  });
});

describe('locale structural parity between en-US and fr-FR', () => {
  it('both locales have the same four keys under errors.arguments', () => {
    const enArgs = enUS.embedsText.errors.arguments as Record<string, unknown>;
    const frArgs = frFR.embedsText.errors.arguments as Record<string, unknown>;

    const expectedKeys = ['voiceChannelNotFound', 'textChannelNotFound', 'guildNotFound', 'queryNotFound'];
    for (const key of expectedKeys) {
      expect(enArgs).toHaveProperty(key);
      expect(frArgs).toHaveProperty(key);
    }
  });

  it('neither locale has the four keys at the old errors root level', () => {
    const enErrors = enUS.embedsText.errors as Record<string, unknown>;
    const frErrors = frFR.embedsText.errors as Record<string, unknown>;

    const movedKeys = ['voiceChannelNotFound', 'textChannelNotFound', 'guildNotFound', 'queryNotFound'];
    for (const key of movedKeys) {
      expect(enErrors[key]).toBeUndefined();
      expect(frErrors[key]).toBeUndefined();
    }
  });

  it('both locales have non-empty string values for all four moved keys', () => {
    const enArgs = enUS.embedsText.errors.arguments as Record<string, unknown>;
    const frArgs = frFR.embedsText.errors.arguments as Record<string, unknown>;

    const keys = ['voiceChannelNotFound', 'textChannelNotFound', 'guildNotFound', 'queryNotFound'];
    for (const key of keys) {
      expect(typeof enArgs[key]).toBe('string');
      expect((enArgs[key] as string).length).toBeGreaterThan(0);
      expect(typeof frArgs[key]).toBe('string');
      expect((frArgs[key] as string).length).toBeGreaterThan(0);
    }
  });
});