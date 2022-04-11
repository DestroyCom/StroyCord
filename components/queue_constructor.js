const playdl = require("play-dl");
const { createAudioPlayer, joinVoiceChannel } = require("@discordjs/voice");

const bases = require("./bases");
const embed_constructor = require("./embed_constructor");
const song_constructor = require("./song_constructor");
const actions = require("./action_function");

const queue_create = async (
  message,
  video,
  voiceChannel,
  index,
  embed,
  type,
  queue,
  PREFIX
) => {
  const serverQueue = queue.get(message.guild.id);
  var songInfo = {};

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

        actions.play(message.guild, queueContruct.songs[0], queue);

        if (type == "playlist") {
          return message.channel.send({
            embeds: [embed_constructor.list(embed[0], embed[1], PREFIX)],
          });
        } else {
          return message.channel.send({
            embeds: [embed_constructor.new(song, embed[0], embed[1])],
          });
        }
      } catch (error) {
        queue.delete(message.guild.id);

        require("./bases").errors(error, message);
      }
    } else {
      serverQueue.songs.push(song);
      if (serverQueue && index === 0)
        return message.channel.send({
          embeds: [embed_constructor.added(song, embed[0], embed[1])],
        });
    }
  } catch (err) {
    console.log(err);
    bases.errors(err.toString(), message);
    return;
  }
};

exports.queue_create = queue_create;
