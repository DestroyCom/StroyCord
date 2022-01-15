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
  //If the bot speaks or word dosent start with triggerd command, ignore the message
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const serverQueue = queue.get(message.guild.id);

  message.delete();

  if (message.content.startsWith(PREFIX + "feur")) {
    //Feur case
    message.channel.send({
      content: "https://destroykeaum.alwaysdata.net/assets/other/feur.mp4",
    });
  } else if (
    message.content.startsWith(`${PREFIX}p`) ||
    message.content.startsWith(`${PREFIX}play`)
  ) {
    //play case
    getURL(message, serverQueue);
    return;
  } else if (
    message.content.startsWith(`${PREFIX}s`) ||
    message.content.startsWith(`${PREFIX}skip`)
  ) {
    //skip case
    skip(message, serverQueue);
    return;
  } else if (
    message.content.startsWith(`${PREFIX}fo`) ||
    message.content.startsWith(`${PREFIX}fuckoff`)
  ) {
    //disconnect case
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${PREFIX}w`)) {
    //pause case
    pause(message, serverQueue);
  } else if (message.content.startsWith(`${PREFIX}r`)) {
    //pause case
    resume(message, serverQueue);
  } else if (message.content.startsWith(`${PREFIX}q`)) {
    //pause case
    actualQueue(message);
  } else {
    message.channel.send({ content: "La commande n'existe pas !" }); //error case
  }
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

  const embedPlayedPlaylist = new MessageEmbed()
    .setTitle(message.author.username + " a ajouté une playlist !")
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.avatarURL(),
    })
    .setColor("#C4302B")
    .setFooter({
      text: "StroyCord/D-Key Bot",
      iconURL:
        "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
    })
    .setThumbnail(
      responsePlaylistInfo[0].snippet.thumbnails[
        Object.keys(responsePlaylistInfo[0].snippet.thumbnails)[
          Object.keys(responsePlaylistInfo[0].snippet.thumbnails).length - 1
        ]
      ].url
    )
    .setTimestamp()
    .setURL("https://youtube.com/playlist?list=" + responsePlaylistInfo[0].id)
    .addFields(
      {
        name: "Nom de la playlist :",
        value: responsePlaylistInfo[0].snippet.title,
        inline: true,
      },
      {
        name: "Playlist crée par :",
        value: responsePlaylistInfo[0].snippet.channelTitle,
        inline: true,
      },
      {
        name: "Mis en file d'attente :",
        value: responsePlaylistSearch.length - 1 + " musiques",
      }
    );

  message.channel.send({ embeds: [embedPlayedPlaylist] });

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
        songs: [],
        volume: 5,
        playing: true,
      };

      queue.set(message.guild.id, queueContruct);

      queueContruct.songs.push(song);

      try {
        const embedPlayed = new MessageEmbed()
          .setTitle(song.title)
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.avatarURL(),
          })
          .setColor("#C4302B")
          .setFooter({
            text: "StroyCord/D-Key Bot",
            iconURL:
              "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
          })
          .setThumbnail(song.thumbnail)
          .setTimestamp()
          .setURL(song.url)
          .addFields(
            {
              name: message.author.username + " a demandé cette musique !",
              value: song.title,
            },
            {
              name: "De :",
              value: song.videoAuthor,
              inline: true,
            },
            {
              name: "Trouvé avec :",
              value: PREFIX + "p " + song.querySearch,
              inline: true,
            },
            {
              name: "Durée :",
              value: song.videoLength,
            }
          );
        message.channel.send({ embeds: [embedPlayed] });

        var connection = await joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        queueContruct.connection = connection;

        play(message.guild, queueContruct.songs[0]);
        return;
      } catch (error) {
        console.log(error);
        queue.delete(message.guild.id);
        return message.channel.send({ content: error });
      }
    } else {
      serverQueue.songs.push(song);
      const embedAdded = new MessageEmbed()
        .setTitle(
          message.author.username +
            " a ajouté une musique sur la file d'attente !"
        )
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.avatarURL(),
        })
        .setColor("#C4302B")
        .setFooter({
          text: "StroyCord/D-Key Bot",
          iconURL:
            "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
        })
        .setThumbnail(song.thumbnail)
        .setTimestamp()
        .setURL(song.url)
        .addFields(
          {
            name: song.title,
            value: "\u200B",
          },
          {
            name: "De :",
            value: song.videoAuthor,
            inline: true,
          },
          {
            name: "Trouvé avec :",
            value: PREFIX + "p " + song.querySearch,
            inline: true,
          },
          {
            name: "Durée :",
            value: song.videoLength,
          }
        );

      return message.channel.send({ embeds: [embedAdded] });
    }
  } catch (err) {
    errors(err.statusCode, message);
    return;
  }
}

async function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.connection.destroy();
    queue.delete(guild.id);
    return;
  }

  const source = await playdl.stream(song.url);
  const stream = createAudioResource(source.stream, {
    inputType: source.type,
  });

  let player = createAudioPlayer();

  player.play(stream);

  serverQueue.connection.subscribe(player);

  player.on("stateChange", (oldState, newState) => {
    console.log(
      `Audio player transitioned from ${oldState.status} to ${newState.status}`
    );
    if (newState.status === "idle") {
      if (serverQueue.songs > 0) {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      } else {
        serverQueue.connection.destroy();
      }
    }
  });
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour arreter une musique !",
    });
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
    serverQueue.connection.dispatcher.pause();
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
    serverQueue.connection.dispatcher.resume();
    serverQueue.connection.dispatcher.pause(true);
    serverQueue.connection.dispatcher.resume();
    return message.channel
      .send({ content: `▶ ${message.author} a repris la musique !` })
      .catch(console.error);
  }
}

function actualQueue(message) {
  const serverQueue = queue.get(message.guild.id);

  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  let songsList = serverQueue.songs;

  if (songsList.length === 0) {
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });
  }
  let tabEmbeds = [];
  songsList.forEach((song, index) => {
    if (index > 10) {
      return;
    } else if (index === 10) {
      tabEmbeds.push({
        name: "...",
        value: "\u200B",
      });
    } else {
      tabEmbeds.push({
        name: index + 1 + ". " + song.title,
        value: song.videoAuthor + ", " + song.videoLength + " minutes.",
      });
    }
  });

  const embedQueue = new MessageEmbed()
    .setTitle(
      "Vous avez " + songsList.length + " musiques en liste d'attente !"
    )
    .setAuthor({
      name: "Stroycord",
      iconURL:
        "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
    })
    .setColor("#37123C")
    .setFooter({
      text: "StroyCord/D-Key Bot",
      iconURL:
        "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
    })
    .setTimestamp()
    .addFields(tabEmbeds);

  return message.channel.send({ embeds: [embedQueue] });
}

function errors(errorCode, message) {
  switch (errorCode) {
    case 403:
    case 410:
      let errorEmbed = new MessageEmbed()
        .setTitle("⚠️ ERREUR : Impossible d'acceder à la musique demandée !")
        .setAuthor({
          name: "Stroycord",
          iconURL:
            "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
        })
        .setColor("#181818")
        .setTimestamp()
        .addFields({
          name: "Les raisons peuvent etre diverses (vidéo soumise a une limite d'âge, privée, bloquée par les ayants droits)",
          value: "Error code : 410",
        });
      return message.channel.send({ embeds: [errorEmbed] });
    default:
      return;
  }
}

clientDiscord.login(process.env.BOT_TOKEN);
