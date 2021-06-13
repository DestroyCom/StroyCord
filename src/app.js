require('dotenv').config();

const Discord = require('discord.js');

const clientDiscord = new Discord.Client();

clientDiscord.once('ready', () => {
    console.log(`Logged in as ${clientDiscord.user.tag}!`);
});

clientDiscord.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.channelID;
    let oldUserChannel = oldMember.channelID;

    const channel = clientDiscord.channels.cache.get(process.env.CHANNEL_ID);
    var leaversUsername = oldMember.member.user.id;

    let channelId = String(process.env.VOICE_CHANNEL_ID);

    if (newUserChannel === channelId) {
        return;
    } else if (leaversUsername === process.env.USER_ID) {
        let msgToSend = "Je reviens :domdolisa:";
        channel.send(msgToSend);
    }
});

clientDiscord.login(process.env.BOT_TOKEN);