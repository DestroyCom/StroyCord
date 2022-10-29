const { EmbedBuilder } = require("discord.js");

exports.new = (song, message, PREFIX) => {
  return new EmbedBuilder()
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
        value: PREFIX + "p " + song.url,
        inline: true,
      },
      {
        name: "Durée :",
        value: song.videoLength,
      }
    );
};

exports.list = (message, playlistData, PREFIX) => {
  let size = playlistData.videos.length;
  if (size > 30) size = 30;

  let msg = new EmbedBuilder()
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
    .setTimestamp()
    .setURL(playlistData.url)
    .addFields(
      {
        name: "Trouvé avec :",
        value: PREFIX + "p " + playlistData.url,
      },
      {
        name: "Nom de la playlist :",
        value: playlistData.title,
        inline: true,
      },
      {
        name: "Playlist crée par :",
        value: playlistData.channel.name,
        inline: true,
      },
      {
        name: "Mis en file d'attente :",
        value:
          (playlistData.videos.length > 30 ? 30 : playlistData.videos.length) +
          " musiques",
      }
    );

  if (playlistData.thumbnail !== undefined)
    msg.setThumbnail(playlistData.thumbnail.url);

  return msg;
};

exports.added = (song, message, PREFIX) => {
  return new EmbedBuilder()
    .setTitle(
      message.author.username + " a ajouté une musique sur la file d'attente !"
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
        value: PREFIX + "p " + song.url,
        inline: true,
      },
      {
        name: "Durée :",
        value: song.videoLength,
      }
    );
};

exports.queue = (songsList) => {
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

  return new EmbedBuilder()
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
};

exports.error = (errorMsg) => {
  return new EmbedBuilder()
    .setTitle("⚠️ UNE ERREUR S'EST PRODUITE !")
    .setDescription(errorMsg)
    .setAuthor({
      name: "Stroycord",
      iconURL:
        "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png",
    })
    .setColor("#181818")
    .setTimestamp();
};
