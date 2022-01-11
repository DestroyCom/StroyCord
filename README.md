# StroyCord/D-Key Bot (Previously JE REVIENS OF DEVILKING)

Since the recent action of youtube to close the most used bots on discord, I had the desire to create my own.
This project being at the beginning "Je Reviens Of DevilKing", so it can also sends the message "I'll be back" every time a specific user disconnects from a specific discord voice room and allow you to "feur" your friends.

## How to use it ?

The bot has 4 commands:

- ``&p [music url or music name]`` / ``&play [music url or music name]`` is used to start playing music.
- ``&s`` / ``&skip`` is used to skip the current music
- ``&fo`` / ``&fuckoff`` disconnects the bot and stops the music playing
- ``&ne`` play the french Xiaomi 11 Lite NE Song.
- ``&q`` display the current music queue.
- ``&feur`` is used to be able to "feur" your friends

## Deploys

**You will need a *Youtube API Key* and a *Discord Developper Application* !!**

### Deploy on Heroku

*You can easily deploy it on Heroku with this button :*

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/DestroyCom/JE-REVIENS-OF-DEVILKING
)

### Deploy on localhost

*To see how to deploy it in the cloud, please see the section above*  
You can start this project in a few steps :

1. Clone this directory,
2. run the command npm install,
3. download ffmpeg at [ffmpeg.org](https://www.ffmpeg.org/) and install *"ffmpeg.exe"*, *"ffplay.exe"* and *"ffprobe.exe"* in the root folder
4. Then rename the file '.env.dist' into '.env',
5. Once you have your accounts and the keys, replace the variables in the '.env' with your own.

You can now launch it with the command ``npm start``.

## What does the bot use?

The bot uses :

- Discord.JS - [Website](https://discord.js.org/#/) - [Github repository](https://github.com/discordjs/discord.js/)
- dotenv - [dotenv on npm](https://www.npmjs.com/package/dotenv)
- esm - [esm on npm](https://www.npmjs.com/package/esm)
- google APIs [Website](https://developers.google.com/) - [npm](https://www.npmjs.com/package/googleapis)
- ffmpeg - [website](https://www.ffmpeg.org/)
- fluent ffmpeg - [fluent-ffmpeg on npm](https://www.npmjs.com/package/fluent-ffmpeg)
- ytdl core - [Github repository](https://github.com/fent/node-ytdl-core) - [ytdl on npm](https://www.npmjs.com/package/ytdl-core)
- Heroku Buildpack FFMPEG - [Github repository](https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest)

# Made by DestCom

|  Who                      | Mail | LinkedIn  | GitHub | Portfolio |
|--------------------------|------|---------- |-----------|-----------|
| Azevedo Da Silva Antoine |   [HERE](antoine.azevedo-da-silva@hetic.net)   |      [HERE](https://www.linkedin.com/in/antoine-ads/) |  [HERE](https://github.com/DestroyCom) |        [HERE](https://destroykeaum.alwaysdata.net/)   |

#### Roadmap

- [x] Basic features (play/skip/quit)
- [x] Searching music (Youtube API)
- [x] Add first discord embeds
- [x] Update Readme (How to deploy)
- [x] Handle playlist request - [Planned for 0.7 realease]
- [x] Add "pause" & "resume" feature [Planned for 0.8 realease]
- [x] Delete request message [Planned for 0.8 realease]
- [x] Display actual song queue [Planned for 0.8 realease]
- [ ] Transform current function into modules [Planned for 0.9 realease]
- [ ] Add customs prefix [Planned for 0.8/0.9 realease]
- [ ] Add help for getting API Key [Planned for 0.9 realease]
- [ ] Fix "I'll be back" features and creates a disabling method [Planned before 1.0 realease]
- [ ] Add multi-language support (English/French to start) [Planned before 1.0 realease]
- [x] Handle node majors crash errors
