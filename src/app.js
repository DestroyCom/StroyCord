require('dotenv').config();

const ytdl = require('ytdl-core');

const Discord = require('discord.js');

const clientDiscord = new Discord.Client();

const prefix = '&';

const queue = new Map();

clientDiscord.once('ready', () => {
    console.log(`Logged in as ${clientDiscord.user.tag}!`);
});

clientDiscord.once("reconnecting", () => {
    console.log("Reconnecting!");
});

clientDiscord.once("disconnect", () => {
    console.log("Disconnect!");
});

clientDiscord.on('message', message => {
    if (message.author.bot) return;

    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(prefix + "feur")) {
        message.channel.send("https://destroykeaum.alwaysdata.net/assets/other/feur.mp4");
    } else if ((message.content.startsWith(`${prefix}p`)) || (message.content.startsWith(`${prefix}play`))) {
        execute(message, serverQueue);
        return;
    } else if ((message.content.startsWith(`${prefix}s`)) || (message.content.startsWith(`${prefix}skip`))) {
        skip(message, serverQueue);
        return;
    } else if ((message.content.startsWith(`${prefix}fo`)) || (message.content.startsWith(`${prefix}fuckoff`))) {
        stop(message, serverQueue);
        return;
    } else {
        message.channel.send("La commande n'existe pas !")
    }
})

/*
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

async function execute(message, serverQueue) {
    const arguments = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("Vous avez besoin d'etre dans un salon vocal pour jouer une musique !");
    };
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("Le bot a besoin de la permission d'acceder et de parler dans le salon vocal !");
    }

    const songInfo = await ytdl.getInfo(arguments[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
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
            play(message.guild, queueContruct.songs[0])
        } catch (error) {
            console.log(error);
            queue.delete(message.guild.id)
            return message.channel.send(error);
        }

    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} a été ajouté sur la file d'attente !`)
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url)).on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    }).on("error", error => console.log(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Joue : **${song.title}**`);
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