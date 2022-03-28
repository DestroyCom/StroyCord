const { MessageEmbed } = require("discord.js");

exports.new = (song, message, PREFIX) => {
  console.log("new embed", song, message, PREFIX);
  return new MessageEmbed()
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
};

exports.list = (message, responsePlaylistInfo, responsePlaylistSearch) => {
  return new MessageEmbed()
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
};

exports.added = (song, message, PREFIX) => {
  console.log("new embed");
  return new MessageEmbed()
    .setTitle(
      message.author.username + " a ajouté une musique sur la file d'attente !"
    )
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.avatarURL(),
      trez,
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

  return new MessageEmbed()
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

exports.error = () => {
  console.log("new embed");
  return new MessageEmbed()
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
};
