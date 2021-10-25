require('dotenv').config();

const ytdl = require('ytdl-core-discord');
const Discord = require('discord.js');
const {
    MessageEmbed
} = require('discord.js');


const clientDiscord = new Discord.Client();

const prefix = '&';
const queue = new Map();

const {
    google
} = require('googleapis');

//When the bot connect for the first time
clientDiscord.once('ready', () => {
    console.log(`Logged in as ${clientDiscord.user.tag}!`);
});

//When the bot reconnect
clientDiscord.once("reconnecting", () => {
    console.log("Reconnecting!");
});

//When the bot disconnect
clientDiscord.once("disconnect", () => {
    console.log("Disconnect!");
});

//Error handler - ex : ECONNRESET 
clientDiscord.on('uncaughtException', function (err) {
    console.log(err);
})

clientDiscord.on('error', error => {
    console.log('Error occured :', error)
});

//Main chat listener
clientDiscord.on('message', message => {
    //If the bot speaks or word dosent start with triggerd command, ignore the message
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(prefix + "feur")) { //Feur case
        message.channel.send("https://destroykeaum.alwaysdata.net/assets/other/feur.mp4");
    } else if ((message.content.startsWith(`${prefix}p`)) || (message.content.startsWith(`${prefix}play`))) { //play case
        getURL(message, serverQueue);
        return;
    } else if ((message.content.startsWith(`${prefix}s`)) || (message.content.startsWith(`${prefix}skip`))) { //skip case
        skip(message, serverQueue);
        return;
    } else if ((message.content.startsWith(`${prefix}fo`)) || (message.content.startsWith(`${prefix}fuckoff`))) { //disconnect case
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}w`)) { //pause case
        pause(message, serverQueue);
    } else if (message.content.startsWith(`${prefix}r`)) { //pause case
        resume(message, serverQueue);
    } else {
        message.channel.send("La commande n'existe pas !") //error case
    }
})

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
    const arguments = message.content.split(" ");
    const messageReceived = message.content;
    const youtubeUrlPattern = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("Vous avez besoin d'etre dans un salon vocal pour jouer une musique !");
    };
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("Le bot a besoin de la permission d'acceder et de parler dans le salon vocal !");
    }
    if (arguments[1] === undefined) {
        return message.channel.send("Erreur dans la commande !");
    }

    const playlistUrlValid = youtubeUrlPattern.test(arguments[1]);

    if (!playlistUrlValid) {
        let tmpQuery = ""
        if (messageReceived.includes('&play ')) {
            tmpQuery = messageReceived.replace('&play ', '')
        }
        if (messageReceived.includes('&p ')) {
            tmpQuery = messageReceived.replace('&p ', '')
        }


        google.youtube('v3').search.list({
            key: process.env.GOOGLE_YOUTUBE_API_KEY,
            part: 'snippet',
            q: tmpQuery
        }).then((response) => {
            let urlTmp = "https://www.youtube.com/watch?v=" + response.data.items[0].id.videoId;
            execute(urlTmp, message, serverQueue)
        }).catch((err) => console.log(err))
    } else {
        let playlistPattern = new RegExp("[&?]list=([a-z0-9_-]+)", "i");
        if (playlistPattern.test(arguments[1])) {
            executePlaylist(arguments[1], message, serverQueue)
        } else {
            execute(arguments[1], message, serverQueue)
        }
    }

}

async function executePlaylist(playlistURL, message, serverQueue) {

    var responsePlaylistSearch = "";
    var responsePlaylistInfo = "";
    let playlistUrlId = "";
    let extractIdPattern = new RegExp("[&?]list=([a-z0-9_-]+)", "i");
    let extractedID = extractIdPattern.exec(playlistURL);
    playlistUrlId = extractedID[1];

    responsePlaylistInfo = await google.youtube('v3').playlists.list({
        key: process.env.GOOGLE_YOUTUBE_API_KEY,
        part: 'snippet',
        maxResults: 49,
        id: playlistUrlId
    }).then((response) => {
        return response.data.items;
    }).catch((err) => console.log(err))

    responsePlaylistSearch = await google.youtube('v3').playlistItems.list({
        key: process.env.GOOGLE_YOUTUBE_API_KEY,
        part: 'snippet',
        maxResults: 49,
        playlistId: playlistUrlId
    }).then((response) => {
        return response.data.items;
    }).catch((err) => console.log(err));

    var videoIdPlaylist = [];

    for (let i = 0; i < responsePlaylistSearch.length; i++) {
        videoIdPlaylist.push(responsePlaylistSearch[i].snippet.resourceId.videoId)
    }

    const playlistID = videoIdPlaylist;

    const embedPlayedPlaylist = new Discord.MessageEmbed()
        .setTitle(message.author.username + " a ajouté une playlist !")
        .setAuthor(message.author.username, message.author.avatarURL())
        .setColor("#C4302B")
        .setFooter("StroyCord/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
        .setThumbnail(responsePlaylistInfo[0].snippet.thumbnails[Object.keys(responsePlaylistInfo[0].snippet.thumbnails)[Object.keys(responsePlaylistInfo[0].snippet.thumbnails).length - 1]].url)
        .setTimestamp()
        .setURL("https://youtube.com/playlist?list=" + responsePlaylistInfo[0].id)
        .addFields({
            name: 'Nom de la playlist :',
            value: responsePlaylistInfo[0].snippet.title,
            inline: true
        }, {
            name: 'Playlist crée par :',
            value: responsePlaylistInfo[0].snippet.channelTitle,
            inline: true
        }, {
            name: "Mis en file d'attente :",
            value: responsePlaylistSearch.length - 1 + " musiques"
        });

    message.channel.send(embedPlayedPlaylist)

    for (const [index, id] of playlistID.entries()) {
        const serverQueue = queue.get(message.guild.id);
        let urlTmp = "https://www.youtube.com/watch?v=" + id;

        const voiceChannel = message.member.voice.channel;

        var songInfo = {};
        try {
            songInfo = await ytdl.getInfo(urlTmp);

            const song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                thumbnail: songInfo.videoDetails.thumbnails[songInfo.videoDetails.thumbnails.length - 1].url,
                requestAuthor: message.author
            };

            if (index == 0 && !serverQueue) {

                const queueContruct = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true
                }

                queue.set(message.guild.id, queueContruct);

                queueContruct.songs.push(song);

                try {
                    var connection = await voiceChannel.join();
                    queueContruct.connection = connection;

                    const serverQueue = queue.get(message.guild.id);

                    play(message.guild, queueContruct.songs[0], queueContruct.songs[0].requestAuthor);
                } catch (error) {
                    console.log(error);
                    queue.delete(message.guild.id)

                    return message.channel.send(error);
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

async function execute(url, message, serverQueue) {
    const voiceChannel = message.member.voice.channel;

    try {
        var songInfo = await ytdl.getInfo(url);

        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            thumbnail: songInfo.videoDetails.thumbnails[songInfo.videoDetails.thumbnails.length - 1].url,
            requestAuthor: message.author
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            }

            queue.set(message.guild.id, queueContruct);

            queueContruct.songs.push(song);

            try {
                const embedPlayed = new Discord.MessageEmbed()
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

                var connection = await voiceChannel.join();
                queueContruct.connection = connection;

                play(message.guild, queueContruct.songs[0], queueContruct.songs[0].requestAuthor);
                return;

            } catch (error) {
                console.log(error);
                queue.delete(message.guild.id)
                return message.channel.send(error);
            }
        } else {
            serverQueue.songs.push(song);
            const embedAdded = new Discord.MessageEmbed()
                .setTitle(message.author.username + " a ajouté une musique sur la file d'attente !")
                .setAuthor(message.author.username, message.author.avatarURL())
                .setColor("#C4302B")
                .setFooter("StroyCord/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
                .setThumbnail(song.thumbnail)
                .setTimestamp()
                .setURL(song.url)
                .addFields({
                    name: song.title,
                    value: "\u200B"
                });

            return message.channel.send(embedAdded)
        }
    } catch (err) {
        errors(err.statusCode, message);
        return;
    }
}

async function play(guild, song, author) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.play(await ytdl(song.url), {
        type: 'opus',
        filter: 'audioonly'
    }).on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0], author);
    }).on("error", (error) => console.log(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour arreter une musique !"
        );
    if (!serverQueue) {
        return message.channel.send("Aucune musique n'est jouée actuellement !")
    }
    try {
        serverQueue.connection.dispatcher.end();
    } catch {
        serverQueue.connection.dispatcher.destroy();
    }

}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour arreter le bot !"
        );

    if (!serverQueue)
        return message.channel.send("Aucune musique n'est jouée actuellement !");

    serverQueue.songs = [];
    try {
        serverQueue.connection.dispatcher.end();
    } catch {
        serverQueue.connection.dispatcher.destroy();
    }
}

function pause(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour controler le bot !"
        );

    if (!serverQueue)
        return message.channel.send("Aucune musique n'est jouée actuellement !");

    if (serverQueue.playing) {
        serverQueue.playing = false;
        serverQueue.connection.dispatcher.pause();
        return message.channel.send(`⏸ ${message.author} a mis en pause la musique !`).catch(console.error);
    }

}

function resume(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour controler le bot !"
        );

    if (!serverQueue)
        return message.channel.send("Aucune musique n'est jouée actuellement !");


    if (!serverQueue.playing) {
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume();
        serverQueue.connection.dispatcher.pause(true);
        serverQueue.connection.dispatcher.resume();
        return message.channel.send(`▶ ${message.author} a repris la musique !`).catch(console.error);
    }

}

function errors(errorCode, message) {
    switch (errorCode) {
        case 403:
        case 410:
            let errorEmbed = new Discord.MessageEmbed()
                .setTitle("⚠️ ERREUR : Impossible d'acceder à la musique demandée !")
                .setAuthor("StroyCord/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
                .setColor("#181818")
                .setTimestamp()
                .addFields({
                    name: "Les raisons peuvent etre diverses (vidéo soumise a une limite d'âge, privée, bloquée par les ayants droits)",
                    value: "Error code : 410"
                });
            return message.channel.send(errorEmbed);
        default:
            return;
    }
}

clientDiscord.login(process.env.BOT_TOKEN);