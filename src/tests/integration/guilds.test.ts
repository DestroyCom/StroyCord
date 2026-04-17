import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { emptyAllGuild, emptyNextSongs, removeCurrentPlayingSong } from 'src/database/queries/guilds/delete';
import { fetchGuild, getFirstSong, getLastPlayedSong, getNextSongs } from 'src/database/queries/guilds/get';
import { pushSongs, shiftSongs } from 'src/database/queries/guilds/update';
import { guild_model } from 'src/database/schema/guild';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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
  await guild_model.deleteMany({});
});

const mockSong = (title: string) => ({
  title,
  url: `https://youtube.com/watch?v=${title}`,
  thumbnail: 'https://example.com/thumb.jpg',
  videoAuthor: 'Author',
  videoLength: '3:30',
  minutes: 3,
  seconds: 30,
  requestDateTimestamp: Date.now(),
  requestAuthor: { id: 'u1', username: 'test' },
  requestChannel: 'ch1',
  isQueueStart: true,
  isComingFromPlaylist: false,
});

const GUILD_ID = 'guild-123';

describe('fetchGuild', () => {
  it('creates a new guild document when none exists', async () => {
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.guildId).toBe(GUILD_ID);
    expect(guild.nextSongs).toEqual([]);
  });

  it('returns the existing guild when it already exists', async () => {
    await fetchGuild(GUILD_ID);
    // Call again — should not create a duplicate
    const guild2 = await fetchGuild(GUILD_ID);
    expect(guild2.guildId).toBe(GUILD_ID);
    const count = await guild_model.countDocuments({ guildId: GUILD_ID });
    expect(count).toBe(1);
  });

  it('throws when guildId is empty', async () => {
    await expect(fetchGuild('')).rejects.toThrow('GuildID not specified !');
  });
});

describe('pushSongs', () => {
  it('adds songs to the nextSongs queue', async () => {
    await fetchGuild(GUILD_ID);
    const songA = mockSong('songA');
    const songB = mockSong('songB');
    await pushSongs(GUILD_ID, [songA, songB]);
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toHaveLength(2);
    expect((guild.nextSongs[0] as typeof songA).title).toBe('songA');
    expect((guild.nextSongs[1] as typeof songB).title).toBe('songB');
  });

  it('appends to an existing queue', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('first')]);
    await pushSongs(GUILD_ID, [mockSong('second')]);
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toHaveLength(2);
  });
});

describe('getFirstSong', () => {
  it('returns undefined when the queue is empty', async () => {
    await fetchGuild(GUILD_ID);
    const first = await getFirstSong(GUILD_ID);
    expect(first).toBeUndefined();
  });

  it('returns the first song in the queue', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('alpha'), mockSong('beta')]);
    const first = await getFirstSong(GUILD_ID);
    expect((first as ReturnType<typeof mockSong>).title).toBe('alpha');
  });
});

describe('getNextSongs', () => {
  it('returns an empty array when queue has 0 or 1 song', async () => {
    await fetchGuild(GUILD_ID);
    const none = await getNextSongs(GUILD_ID);
    expect(none).toEqual([]);

    await pushSongs(GUILD_ID, [mockSong('only')]);
    const oneItem = await getNextSongs(GUILD_ID);
    expect(oneItem).toEqual([]);
  });

  it('returns all songs after the first', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('a'), mockSong('b'), mockSong('c')]);
    const next = await getNextSongs(GUILD_ID);
    expect(next).toHaveLength(2);
    expect((next[0] as ReturnType<typeof mockSong>).title).toBe('b');
    expect((next[1] as ReturnType<typeof mockSong>).title).toBe('c');
  });
});

describe('shiftSongs', () => {
  it('moves the first song to previouslyPlayedSongs and removes it from nextSongs', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('first'), mockSong('second')]);
    await shiftSongs(GUILD_ID);
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toHaveLength(1);
    expect((guild.nextSongs[0] as ReturnType<typeof mockSong>).title).toBe('second');
    expect(guild.previouslyPlayedSongs).toHaveLength(1);
    expect((guild.previouslyPlayedSongs[0] as ReturnType<typeof mockSong>).title).toBe('first');
  });

  it('empties nextSongs gracefully when queue is already empty', async () => {
    await fetchGuild(GUILD_ID);
    // nextSongs defaults to [] — shiftSongs should not throw
    await expect(shiftSongs(GUILD_ID)).resolves.toBeDefined();
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toEqual([]);
  });
});

describe('emptyNextSongs', () => {
  it('clears all songs from the queue', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('x'), mockSong('y'), mockSong('z')]);
    await emptyNextSongs(GUILD_ID);
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toEqual([]);
  });
});

describe('removeCurrentPlayingSong', () => {
  it('removes the first song and adds it to history', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('current'), mockSong('next')]);
    await removeCurrentPlayingSong(GUILD_ID);
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toHaveLength(1);
    expect((guild.nextSongs[0] as ReturnType<typeof mockSong>).title).toBe('next');
    expect(guild.previouslyPlayedSongs).toHaveLength(1);
    expect((guild.previouslyPlayedSongs[0] as ReturnType<typeof mockSong>).title).toBe('current');
  });

  it('empties nextSongs gracefully when queue is already empty', async () => {
    await fetchGuild(GUILD_ID);
    await expect(removeCurrentPlayingSong(GUILD_ID)).resolves.toBeDefined();
    const guild = await fetchGuild(GUILD_ID);
    expect(guild.nextSongs).toEqual([]);
  });
});

describe('getLastPlayedSong', () => {
  it('returns undefined when history is empty', async () => {
    await fetchGuild(GUILD_ID);
    const last = await getLastPlayedSong(GUILD_ID);
    expect(last).toBeUndefined();
  });

  it('returns the last song in previouslyPlayedSongs after a shift', async () => {
    await fetchGuild(GUILD_ID);
    await pushSongs(GUILD_ID, [mockSong('one'), mockSong('two')]);
    await shiftSongs(GUILD_ID);
    await shiftSongs(GUILD_ID);
    const last = await getLastPlayedSong(GUILD_ID);
    expect((last as ReturnType<typeof mockSong>).title).toBe('two');
  });
});

describe('emptyAllGuild', () => {
  it('empties nextSongs for all guilds', async () => {
    await fetchGuild('guild-A');
    await fetchGuild('guild-B');
    await pushSongs('guild-A', [mockSong('s1')]);
    await pushSongs('guild-B', [mockSong('s2')]);
    await emptyAllGuild();
    const guildA = await fetchGuild('guild-A');
    const guildB = await fetchGuild('guild-B');
    expect(guildA.nextSongs).toEqual([]);
    expect(guildB.nextSongs).toEqual([]);
  });
});
