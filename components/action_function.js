const playdl = require("play-dl");
const { AudioPlayerStatus, createAudioResource } = require("@discordjs/voice");

const embed_constructor = require("./embed_constructor");

const play = async (guild, song, queue) => {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    queue.delete(guild.id);
    try {
      if (serverQueue) {
        serverQueue.connection.destroy();
      }
    } catch (e) {
      console.log("Connection already destroyed");
      console.log(e);
      require("./bases").log.error({
        message: `Error occured : ${e}`,
        where: "discord",
        action: "play",
      });
    }
    return;
  }

  var source = await playdl.stream(song.url);

  const stream = createAudioResource(source.stream, {
    inputType: source.type,
  });

  serverQueue.player.play(stream);

  serverQueue.connection.subscribe(serverQueue.player);

  serverQueue.player.on(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    play(guild, serverQueue.songs[0], queue);
  });

  return;
};

const skip = (message, serverQueue, queue) => {
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
  play(tmpGuildObject, serverQueue.songs[0], queue);
};

const stop = (message, serverQueue, queue) => {
  if (!message.member.voice.channel)
    return message.channel.send({
      content:
        "Vous avez besoin d'etre dans un salon vocal pour arreter le bot !",
    });

  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  try {
    serverQueue.connection.destroy();
  } catch (e) {
    console.log("Connection already destroyed");
    console.log(e);
    require("./bases").log.error({
      message: `Error occured : ${e}`,
      where: "discord",
      action: "stop",
    });
  }
  queue.delete(message.guildId);

  return message.channel
    .send({
      content: `❌ ${message.author} a déconnecté le bot !`,
    })
    .catch(console.error);
};

const pause = (message, serverQueue) => {
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
};

const resume = (message, serverQueue) => {
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
};

const queue = (message, queue) => {
  const serverQueue = queue.get(message.guild.id);
  if (!serverQueue)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });
  let songsList = serverQueue.songs;

  if (!serverQueue || songsList.length === 0)
    return message.channel.send({
      content: "Aucune musique n'est jouée actuellement !",
    });

  return message.channel.send({
    embeds: [embed_constructor.queue(songsList)],
  });
};

exports.play = play;
exports.skip = skip;
exports.stop = stop;
exports.pause = pause;
exports.resume = resume;
exports.queue = queue;
