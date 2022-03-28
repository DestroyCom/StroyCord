require("dotenv").config();

//const ytdl = require("ytdl-core-discord");
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

const { google } = require("googleapis");

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
      content: "There is no song that I could stop!",
    });

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
  console.log("Disconnect!");
});

//Error handler - ex : ECONNRESET
clientDiscord.on("uncaughtException", (err) => {
  const serverQueue = undefined;
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

  test();

  switch (command) {
    case "play":
    case "p":
      getURL(message, serverQueue);
      break;
    case "skip":
    case "s":
      skip(message, serverQueue);
      break;
    case "stop":
    case "st":
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
      message.channel.send({ content: "La commande n'existe pas !" });
      break;
  }

  setTimeout(() => {
    message.delete();
  }, 1000);
});

async function test() {
  let tmp = await playdl.playlist_info(
    "https://youtube.com/playlist?list=PLURXxcqVW69d8EDpGXQ4KCCs6OngrGN2S",
    { incomplete: true }
  );
  console.log(tmp);
}

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

function getURL(message, serverQueue) {
  const arg = message.content.split(" ");
  const messageReceived = message.content;
  const youtubeUrlPattern =
    /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

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
  if (arg[1] === undefined) {
    return message.channel.send({ content: "Erreur dans la commande !" });
  }

  const playlistUrlValid = youtubeUrlPattern.test(arg[1]);

  if (!playlistUrlValid) {
    let tmpQuery = "";
    if (messageReceived.includes(PREFIX + "play ")) {
      tmpQuery = messageReceived.replace(PREFIX + "play ", "");
    }
    if (messageReceived.includes(PREFIX + "p ")) {
      tmpQuery = messageReceived.replace(PREFIX + "p ", "");
    }

    google
      .youtube("v3")
      .search.list({
        key: process.env.GOOGLE_YOUTUBE_API_KEY,
        part: "snippet",
        q: tmpQuery,
      })
      .then((response) => {
        let urlTmp =
          "https://www.youtube.com/watch?v=" +
          response.data.items[0].id.videoId;
        execute(urlTmp, message, serverQueue, urlTmp);
      })
      .catch((err) => console.log(err));
  } else {
    let playlistPattern = new RegExp("[&?]list=([a-z0-9_-]+)", "i");
    if (playlistPattern.test(arg[1])) {
      executePlaylist(arg[1], message, serverQueue, arg[1]);
    } else {
      execute(arg[1], message, serverQueue, arg[1]);
    }
  }
}

async function executePlaylist(playlistURL, message, serverQueue, querySearch) {
  var responsePlaylistSearch = "";
  var responsePlaylistInfo = "";
  let playlistUrlId = "";
  let extractIdPattern = new RegExp("[&?]list=([a-z0-9_-]+)", "i");
  let extractedID = extractIdPattern.exec(playlistURL);
  playlistUrlId = extractedID[1];

  responsePlaylistInfo = await google
    .youtube("v3")
    .playlists.list({
      key: process.env.GOOGLE_YOUTUBE_API_KEY,
      part: "snippet",
      maxResults: 49,
      id: playlistUrlId,
    })
    .then((response) => {
      return response.data.items;
    })
    .catch((err) => console.log(err));

  responsePlaylistSearch = await google
    .youtube("v3")
    .playlistItems.list({
      key: process.env.GOOGLE_YOUTUBE_API_KEY,
      part: "snippet",
      maxResults: 49,
      playlistId: playlistUrlId,
    })
    .then((response) => {
      return response.data.items;
    })
    .catch((err) => console.log(err));

  var videoIdPlaylist = [];

  for (let i = 0; i < responsePlaylistSearch.length; i++) {
    videoIdPlaylist.push(responsePlaylistSearch[i].snippet.resourceId.videoId);
  }

  const playlistID = videoIdPlaylist;

  message.channel.send({
    embeds: [
      embed_constructor.list(
        message,
        responsePlaylistInfo,
        responsePlaylistSearch
      ),
    ],
  });

  for (const [index, id] of playlistID.entries()) {
    const serverQueue = queue.get(message.guild.id);
    let urlTmp = "https://www.youtube.com/watch?v=" + id;

    const voiceChannel = message.member.voice.channel;

    var songInfo = {};
    try {
      var songInfo = await playdl.video_info(urlTmp);

      let minutes = Math.floor(songInfo.video_details.durationInSec / 60);
      let seconds = songInfo.video_details.durationInSec - minutes * 60;

      const song = {
        title: songInfo.video_details.title,
        url: songInfo.video_details.url,
        thumbnail:
          songInfo.video_details.thumbnails[
            songInfo.video_details.thumbnails.length - 1
          ].url,
        requestAuthor: message.author,
        querySearch: querySearch,
        videoAuthor: songInfo.video_details.channel.name,
        videoLength: minutes + ":" + seconds,
      };

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
        } catch (error) {
          console.log(error);
          queue.delete(message.guild.id);

          return message.channel.send({ content: error });
        }
      } else {
        serverQueue.songs.push(song);
      }
    } catch (err) {
      errors(err.statusCode, message);
      return;
    }
  }

  /*
    const playlistEmbeds = new Discord.MessageEmbed()
    .setTitle(song.title)
    .setAuthor(message.author.username, message.author.avatarURL())
    .setColor("#C4302B")
    .setFooter("StroyCord/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
    .setThumbnail(song.thumbnail)
    .setTimestamp()
    .setURL(song.url)
    .addFields({
        name: message.author.username + " a demandé cette musique !",
        value: song.title
    });
    message.channel.send(embedPlayed)  
    */
}

async function execute(url, message, serverQueue, querySearch) {
  const voiceChannel = message.member.voice.channel;

  try {
    var songInfo = await playdl.video_info(url);

    let minutes = Math.floor(songInfo.video_details.durationInSec / 60);
    let seconds = songInfo.video_details.durationInSec - minutes * 60;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    const song = {
      title: songInfo.video_details.title,
      url: songInfo.video_details.url,
      thumbnail:
        songInfo.video_details.thumbnails[
          songInfo.video_details.thumbnails.length - 1
        ].url,
      requestAuthor: message.author,
      querySearch: querySearch,
      videoAuthor: songInfo.video_details.channel.name,
      videoLength: minutes + ":" + seconds,
    };

    if (!serverQueue) {
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
        message.channel.send({
          embeds: [embed_constructor.new(song, message, PREFIX)],
        });

        var connection = await joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        queueContruct.connection = connection;

        var player = createAudioPlayer();
        queueContruct.player = player;

        play(message.guild, queueContruct.songs[0]);
        return;
      } catch (error) {
        console.log(error);
        queue.delete(message.guild.id);
        return message.channel.send({ content: error });
      }
    } else {
      serverQueue.songs.push(song);

      return message.channel.send({
        embeds: [embed_constructor.added(song, message, PREFIX)],
      });
    }
  } catch (err) {
    errors(err.statusCode, message);
    return;
  }
}

async function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    queue.delete(guild.id);
    serverQueue.connection.destroy();
    return;
  }

  var source = null;
  /*  try { */
  console.log("source", song.url);
  source = await playdl.stream(song.url);

  console.log(source);

  const stream = createAudioResource(source.stream, {
    inputType: source.type,
  });

  serverQueue.player.play(stream);

  serverQueue.connection.subscribe(serverQueue.player);
  /* } catch (err) {
    console.log(err, "handleerror");
    skip("skipError", serverQueue);
  } */

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
    .send({ content: `❌ ${message.author} a déconnecté le bot !` })
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
      .send({ content: `⏸ ${message.author} a mis en pause la musique !` })
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
      .send({ content: `▶ ${message.author} a repris la musique !` })
      .catch(console.error);
  }
}

function actualQueue(message) {
  const serverQueue = queue.get(message.guild.id);

  if (!serverQueue || songsList.length === 0)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  let songsList = serverQueue.songs;
  return message.channel.send({ embeds: [embed_constructor.queue(songsList)] });
}

function errors(errorCode, message) {
  switch (errorCode) {
    case 403:
    case 410:
      return message.channel.send({ embeds: [embed_constructor.error()] });
    default:
      return;
  }
}

clientDiscord.login(process.env.BOT_TOKEN);
