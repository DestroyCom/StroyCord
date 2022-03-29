require("dotenv").config();

const playdl = require("play-dl");
/* playdl.getFreeClientID().then((clientID) => {
  playdl.setToken({
    soundcloud: process.env.SOUNDCLOUD_CLIENT_ID,
  });
}); */
const { Client, Intents, MessageEmbed } = require("discord.js");
const {
  createAudioResource,
  createAudioPlayer,
  joinVoiceChannel,
  generateDependencyReport,
  NoSubscriberBehavior,
} = require("@discordjs/voice");

console.log(generateDependencyReport());

const clientDiscord = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
  ],
});

const PREFIX = process.env.TRIGGER_PREFIX;
const queue = new Map();

const embed_constructor = require("./components/embed_constructor");
const song_constructor = require("./components/song_constructor");

//When the bot connect for the first time
clientDiscord.once("ready", () => {
  console.log(`Logged in as ${clientDiscord.user.tag}!`);
});

//When the bot reconnect
clientDiscord.once("reconnecting", () => {
  console.log("Reconnecting!");
});

//When the bot disconnect
clientDiscord.on("disconnect", (message) => {
  const serverQueue = queue.get(message.guild.id);

  if (!serverQueue)
    return message.channel.send({
      content: "Je ne suis pas connecté dans un salon vocal !",
    });

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
  console.log("Disconnect!");
});

//Error handler - ex : ECONNRESET
clientDiscord.on("uncaughtException", (err) => {
  console.log(err);
});

clientDiscord.on("error", (error) => {
  console.log("Error occured :", error);
});

//Main chat listener
clientDiscord.on("messageCreate", (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const serverQueue = queue.get(message.guild.id);
  let messageArray = message.content.split(" ");

  const command = messageArray[0].slice(PREFIX.length);
  switch (command) {
    case "play":
    case "p":
      getURL(message, serverQueue);
      break;
    case "skip":
    case "s":
      skip(message, serverQueue);
      break;
    case "fuckoff":
    case "fo":
      stop(message, serverQueue);
      break;
    case "pause":
    case "pa":
      pause(message, serverQueue);
      break;
    case "resume":
    case "re":
      resume(message, serverQueue);
      break;
    case "queue":
    case "q":
      actualQueue(message);
      break;
    default:
      message.channel.send({
        content: "La commande n'existe pas !",
      });
      break;
  }

  setTimeout(() => {
    message.delete();
  }, 1000);
});

/*

JE Reviens case

clientDiscord.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.channelID;
    let oldUserChannel = oldMember.channelID;

    const channel = clientDiscord.channels.cache.get(process.env.CHANNEL_ID);
    var leaversUsername = oldMember.member.user.id;

    let channelId = String(process.env.VOICE_CHANNEL_ID);

    if (newUserChannel === channelId) {
        return;
    } else if (leaversUsername === process.env.USER_ID) {
        let msgToSend = "Je reviens !";
        channel.send(msgToSend);
    }
});
*/

async function getURL(message) {
  const arg = message.content.split(" ").slice(1);

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour jouer une musique !",
    });
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send({
      content:
        "Le bot a besoin de la permission d'acceder et de parler dans le salon vocal !",
    });
  }

  if (arg[0] === undefined) {
    return message.channel.send({
      content: "Erreur dans la commande !",
    });
  }

  const test_type = playdl.yt_validate(arg[0]);

  if (test_type === "search") {
    let searchedVideo = await playdl.search(arg[0], {
      limit: 1,
    });

    let embed_infos = [message, PREFIX];
    await queue_create(
      message,
      searchedVideo,
      voiceChannel,
      0,
      embed_infos,
      test_type
    );
  } else {
    if (test_type === "playlist") {
      console.log(arg[0]);
      let playlistData = await playdl.playlist_info(arg[0], {
        incomplete: true,
      });

      let embed_infos = [message, playlistData];

      for (const [index, video] of playlistData.videos.entries()) {
        if (index === 30) break;
        await queue_create(
          message,
          video,
          voiceChannel,
          index,
          embed_infos,
          test_type
        );
      }
    } else {
      let embed_infos = [message, PREFIX];

      await queue_create(
        message,
        { url: arg[0] },
        voiceChannel,
        0,
        embed_infos,
        test_type
      );
    }
  }
}

async function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    queue.delete(guild.id);
    serverQueue.connection.destroy();
    return;
  }

  console.log(song.title, "source.url");
  var source = await playdl.stream(song.url);

  console.log(source);

  const stream = createAudioResource(source.stream, {
    inputType: source.type,
  });

  serverQueue.player.play(stream);

  serverQueue.connection.subscribe(serverQueue.player);

  serverQueue.player.on("stateChange", (oldState, newState) => {
    console.log(
      `Audio player transitioned from ${oldState.status} to ${newState.status}`
    );

    if (newState.status === "idle") {
      if (serverQueue.songs.length != 0 && serverQueue.songs.length >= 0) {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      } else {
        queue.delete(guild.id);
        serverQueue.connection.destroy();
      }
    }
  });

  return;
}

function skip(message, serverQueue) {
  if (message !== "skipError") {
    if (!message.member.voice.channel)
      return message.channel.send({
        content:
          "Vous avez besoin d'etre dans un salon vocal pour arreter une musique !",
      });
  }
  if (!serverQueue) {
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });
  }

  let tmpGuildObject = {
    id: message.guildId,
  };

  serverQueue.songs.shift();
  play(tmpGuildObject, serverQueue.songs[0]);
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour arreter le bot !",
    });

  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  serverQueue.connection.destroy();
  queue.delete(message.guildId);

  return message.channel
    .send({
      content: `❌ ${message.author} a déconnecté le bot !`,
    })
    .catch(console.error);
}

function pause(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour controler le bot !",
    });

  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  if (serverQueue.playing) {
    serverQueue.playing = false;
    serverQueue.player.pause();
    return message.channel
      .send({
        content: `⏸ ${message.author} a mis en pause la musique !`,
      })
      .catch(console.error);
  }
}

function resume(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour controler le bot !",
    });

  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  if (!serverQueue.playing) {
    serverQueue.playing = true;
    serverQueue.player.unpause();
    return message.channel
      .send({
        content: `▶ ${message.author} a repris la musique !`,
      })
      .catch(console.error);
  }
}

function actualQueue(message) {
  const serverQueue = queue.get(message.guild.id);
  let songsList = serverQueue.songs;

  if (!serverQueue || songsList.length === 0)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  return message.channel.send({
    embeds: [embed_constructor.queue(songsList)],
  });
}

function errors(errorCode, message) {
  switch (errorCode) {
    case 403:
    case 410:
      return message.channel.send({
        embeds: [embed_constructor.error()],
      });
    default:
      return;
  }
}

async function queue_create(message, video, voiceChannel, index, embed, type) {
  const serverQueue = queue.get(message.guild.id);
  var songInfo = {};
  console.log(video.url);
  try {
    var songInfo = await playdl.video_info(video.url);

    let minutes = Math.floor(songInfo.video_details.durationInSec / 60);
    let seconds = songInfo.video_details.durationInSec - minutes * 60;

    const song = await song_constructor.song(
      songInfo,
      message,
      minutes,
      seconds
    );

    if (index == 0 && !serverQueue) {
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        player: null,
        songs: [],
        volume: 5,
        playing: true,
      };

      queue.set(message.guild.id, queueContruct);

      queueContruct.songs.push(song);

      try {
        var connection = await joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        queueContruct.connection = connection;

        var player = createAudioPlayer();
        queueContruct.player = player;

        play(message.guild, queueContruct.songs[0]);

        console.log(type, embed);
        if (type == "playlist") {
          return message.channel.send({
            embeds: [embed_constructor.list(embed[0], embed[1])],
          });
        } else {
          return message.channel.send({
            embeds: [embed_constructor.new(song, embed[0], embed[1])],
          });
        }
      } catch (error) {
        console.log(error);
        queue.delete(message.guild.id);

        return message.channel.send({
          content: error,
        });
      }
    } else {
      console.log(index);
      serverQueue.songs.push(song);
      if (serverQueue && index === 0)
        return message.channel.send({
          embeds: [embed_constructor.added(song, embed[0], embed[1])],
        });
    }
  } catch (err) {
    errors(err.statusCode, message);
    return;
  }
}

clientDiscord.login(process.env.BOT_TOKEN);
