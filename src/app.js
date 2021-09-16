require('dotenv').config();

const ytdl = require('ytdl-core');
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

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("Vous avez besoin d'etre dans un salon vocal pour jouer une musique !");
    };
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("Le bot a besoin de la permission d'acceder et de parler dans le salon vocal !");
    }

    if (!(messageReceived.includes('https://www.youtube.'))) {

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
        execute(arguments[1], message, serverQueue)
    }

}

async function execute(url, message, serverQueue) {

    const voiceChannel = message.member.voice.channel;

    const songInfo = await ytdl.getInfo(url);

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
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0], queueContruct.songs[0].requestAuthor)
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
        .setFooter("StroyBot/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
        .setTimestamp()
        .setURL(song.url)
        .addFields({
            name: song.title,
            value: "🎵 🎵 🎵 🎵 🎵"
        });

        return message.channel.send(embedAdded)
    }
}

function play(guild, song, author) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url)).on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0], author);
    }).on("error", error => console.log(error));

    const embedPlayed = new Discord.MessageEmbed()
        .setTitle(song.title)
        .setAuthor(author.username, author.avatarURL())
        .setColor("#C4302B")
        .setFooter("StroyBot/D-Key Bot", "https://destroykeaum.alwaysdata.net/assets/other/stroybot_logo.png")
        .setThumbnail(song.thumbnail)
        .setTimestamp()
        .setURL(song.url)
        .addFields({
            name: author.username + " a lancé une musique !",
            value: song.title
        });

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    serverQueue.textChannel.send(embedPlayed);
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour arreter une musique !"
        );
    if (!serverQueue) {
        return message.channel.send("Aucune musique n'est jouée actuellement !")
    }
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Vous avez besoin d'etre dans un salon vocal pour arreter le bot !"
        );

    if (!serverQueue)
        return message.channel.send("Aucune musique n'est jouée actuellement !");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

clientDiscord.login(process.env.BOT_TOKEN);