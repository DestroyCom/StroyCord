import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&', LANGUAGE: 'en-US', DETECT_FROM_ALL_MESSAGES: false, MAX_QUEUE_SIZE: 100 },
}));

import { onGuildLeft, purgeLeftGuilds } from 'src/core/guildLifecycle';
import { getStatsSummary, getTop, insertPlay, type PlayRecord } from 'src/database/queries/plays';
import { play_model } from 'src/database/schema/play';

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
  await play_model.deleteMany({});
});

const DAY = 24 * 60 * 60 * 1000;
// 2026-01-10 20:30 UTC = 21:30 in Paris
const BASE = Date.UTC(2026, 0, 10, 20, 30);

const play = (overrides: Partial<PlayRecord> & { videoId: string }): PlayRecord => ({
  guildId: 'g1',
  title: `Title ${overrides.videoId}`,
  videoAuthor: 'Artist A',
  durationSec: 200,
  listenedMs: 200_000,
  requestedBy: { id: 'alice', username: 'Alice' },
  fromPlaylist: false,
  skipped: false,
  startedAt: new Date(BASE),
  endedAt: new Date(BASE + 200_000),
  ...overrides,
});

const seed = () =>
  Promise.all([
    insertPlay(play({ videoId: 'v1' })),
    insertPlay(play({ videoId: 'v1' })),
    insertPlay(play({ videoId: 'v1', requestedBy: { id: 'bob', username: 'Bob' } })),
    insertPlay(play({ videoId: 'v2', videoAuthor: 'Artist B', listenedMs: 30_000, skipped: true })),
    insertPlay(
      play({ videoId: 'v3', requestedBy: { id: 'bob', username: 'Bob' }, startedAt: new Date(BASE - 40 * DAY) })
    ),
    insertPlay(play({ videoId: 'v9', guildId: 'other' })),
  ]);

describe('getStatsSummary', () => {
  it('aggregates a guild, ignoring other guilds', async () => {
    await seed();
    const summary = await getStatsSummary({ guildId: 'g1' }, 'Europe/Paris');
    expect(summary).toMatchObject({ plays: 5, listenedMs: 830_000, skipped: 1, uniqueTracks: 3, peakHour: 21 });
    expect(summary.topTrack).toMatchObject({ key: 'v1', label: 'Title v1', detail: 'Artist A', plays: 3 });
    expect(summary.topArtist).toMatchObject({ label: 'Artist A', plays: 4 });
    expect(summary.topDj).toMatchObject({ key: 'alice', label: 'Alice', plays: 3 });
  });

  it('filters by period and member', async () => {
    await seed();
    const recent = await getStatsSummary({ guildId: 'g1', since: new Date(BASE - 7 * DAY) }, 'UTC');
    expect(recent.plays).toBe(4);
    expect(recent.peakHour).toBe(20);
    const bob = await getStatsSummary({ guildId: 'g1', userId: 'bob' }, 'UTC');
    expect(bob).toMatchObject({ plays: 2, uniqueTracks: 2 });
  });

  it('returns zeros without plays', async () => {
    const summary = await getStatsSummary({ guildId: 'empty' }, 'UTC');
    expect(summary).toMatchObject({ plays: 0, listenedMs: 0, uniqueTracks: 0 });
    expect(summary.topTrack).toBeUndefined();
  });
});

describe('getTop', () => {
  it('ranks by plays then listening time, with stable pagination', async () => {
    await seed();
    const first = await getTop({ guildId: 'g1' }, 'tracks', 0, 2);
    expect(first.total).toBe(3);
    expect(first.entries.map((e) => e.key)).toEqual(['v1', 'v3']);
    const second = await getTop({ guildId: 'g1' }, 'tracks', 2, 2);
    expect(second.entries.map((e) => e.key)).toEqual(['v2']);
  });

  it('ranks artists and DJs', async () => {
    await seed();
    const artists = await getTop({ guildId: 'g1' }, 'artists', 0, 10);
    expect(artists.entries.map((e) => [e.label, e.plays])).toEqual([
      ['Artist A', 4],
      ['Artist B', 1],
    ]);
    const djs = await getTop({ guildId: 'g1' }, 'djs', 0, 10);
    expect(djs.entries.map((e) => [e.key, e.plays])).toEqual([
      ['alice', 3],
      ['bob', 2],
    ]);
  });
});

describe('retention', () => {
  it('purges the stats of a guild the bot left more than 30 days ago', async () => {
    await seed();
    await onGuildLeft('g1');
    await purgeLeftGuilds(Date.now() + 31 * DAY);
    expect(await play_model.countDocuments({ guildId: 'g1' })).toBe(0);
    expect(await play_model.countDocuments({ guildId: 'other' })).toBe(1);
  });
});
