require("dotenv").config();

const playdl = require("play-dl");
/* playdl.getFreeClientID().then((clientID) => {
  playdl.setToken({
    soundcloud: process.env.SOUNDCLOUD_CLIENT_ID,
  });
}); */
const { Client, GatewayIntentBits, Events } = require("discord.js");

const clientDiscord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
  ],
});

const PREFIX = process.env.TRIGGER_PREFIX;
const queue = new Map();

const actions = require("./components/action_function");
const queue_handler = require("./components/queue_constructor");

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

clientDiscord.on(Events.InteractionCreate, (interaction) => {
  console.log(interaction);
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
      actions.skip(message, serverQueue, queue);
      break;
    case "fuckoff":
    case "fo":
      actions.stop(message, serverQueue, queue);
      break;
    case "pause":
    case "pa":
      actions.pause(message, serverQueue);
      break;
    case "resume":
    case "re":
      actions.resume(message, serverQueue);
      break;
    case "queue":
    case "q":
      actions.queue(message, queue);
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
  var arg = message.content.split(" ").slice(1);

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
    arg = await message.content.replace(PREFIX + "p", "");
    let searchedVideo = await playdl.search(arg, { limit: 1 });

    let embed_infos = [message, PREFIX];
    await queue_handler.queue_create(
      message,
      searchedVideo[0],
      voiceChannel,
      0,
      embed_infos,
      test_type,
      queue,
      PREFIX
    );
  } else {
    if (test_type === "playlist") {
      let playlistData = await playdl.playlist_info(arg[0], {
        incomplete: true,
      });

      let embed_infos = [message, playlistData];

      for (const [index, video] of playlistData.videos.entries()) {
        if (index === 30) break;
        let response = null;
        response = await queue_handler.queue_create(
          message,
          video,
          voiceChannel,
          index,
          embed_infos,
          test_type,
          queue,
          PREFIX
        );

        if (response === "ERR") break;
      }
    } else {
      let embed_infos = [message, PREFIX];

      await queue_handler.queue_create(
        message,
        { url: arg[0] },
        voiceChannel,
        0,
        embed_infos,
        test_type,
        queue,
        PREFIX
      );
    }
  }
}

require("./components/bases").dependencies_reports();
clientDiscord.login(process.env.BOT_TOKEN);
