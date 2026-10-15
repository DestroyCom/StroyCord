import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'en-US', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));

import { onGuildLeft, onGuildsJoined, purgeLeftGuilds } from 'src/core/guildLifecycle';
import { forgetGuildSettings, getGuildSettings, resetGuildSettings, updateGuildSettings } from 'src/core/settings';
import { emptyAllGuild } from 'src/database/queries/guilds/delete';
import { guild_settings_model } from 'src/database/schema/guildSettings';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'test' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await guild_settings_model.deleteMany({});
  for (const id of ['g1', 'g2']) forgetGuildSettings(id);
});

describe('guild settings', () => {
  it('returns the instance defaults without creating a document', async () => {
    const settings = await getGuildSettings('g1');
    expect(settings.prefix).toBe('&');
    expect(await guild_settings_model.countDocuments()).toBe(0);
  });

  it('persists overrides, independently per guild', async () => {
    await updateGuildSettings('g1', { prefix: '!', commandChannelIds: ['c1'], maxQueueSize: 10 }, 'admin');
    forgetGuildSettings('g1'); // simulate a restart: read back from MongoDB
    const g1 = await getGuildSettings('g1');
    expect(g1).toMatchObject({ prefix: '!', commandChannelIds: ['c1'], maxQueueSize: 10 });
    expect((await getGuildSettings('g2')).prefix).toBe('&');
    expect((await guild_settings_model.findOne({ guildId: 'g1' }).lean())?.updatedBy).toBe('admin');
  });

  it('survives the startup reset of runtime state', async () => {
    await updateGuildSettings('g1', { language: 'fr-FR' }, 'admin');
    await emptyAllGuild();
    forgetGuildSettings('g1');
    expect((await getGuildSettings('g1')).language).toBe('fr-FR');
  });

  it('resets every override to the defaults', async () => {
    await updateGuildSettings('g1', { prefix: '!', statsEnabled: false }, 'admin');
    await resetGuildSettings('g1', 'admin');
    forgetGuildSettings('g1');
    expect(await getGuildSettings('g1')).toMatchObject({ prefix: '&', statsEnabled: true });
  });
});

describe('guild lifecycle', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('keeps settings during the grace period and purges them after', async () => {
    await updateGuildSettings('g1', { prefix: '!' }, 'admin');
    await onGuildLeft('g1');
    expect(await purgeLeftGuilds(Date.now() + 29 * DAY)).toBe(0);
    expect((await getGuildSettings('g1')).prefix).toBe('!');
    expect(await purgeLeftGuilds(Date.now() + 31 * DAY)).toBe(1);
    expect((await getGuildSettings('g1')).prefix).toBe('&');
  });

  it('cancels the purge when the bot comes back', async () => {
    await updateGuildSettings('g1', { prefix: '!' }, 'admin');
    await onGuildLeft('g1');
    await onGuildsJoined(['g1']);
    expect(await purgeLeftGuilds(Date.now() + 31 * DAY)).toBe(0);
    expect((await getGuildSettings('g1')).prefix).toBe('!');
  });
});
