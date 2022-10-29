# StroyCord/D-Key Bot (Previously JE REVIENS OF DEVILKING)

Since the recent action of youtube to close the most used bots on discord, I wanted to create my own.
This project being at the beginning a private joke called "Je Reviens Of DevilKing", it can also sends the message "I'll be back" every time a specific user disconnects from a specific discord voice room and allow you to "feur" your friends.

## How to use it ?

The bot has 4 commands:
_You have to add your prefix before each command (e.g. `&p [music]`)_

- `play [music url or music name]` is used to start playing music (or `p`).
- `skip` is used to skip the current music (or `s`).
- `pause` is used to pause the current music (or `pa`).
- `resume` is used to resume the current music (or `re`).
- `fuckoff` disconnects the bot and stops the music playing (or `fo`).
- `queue` display the current music queue (or `q`).

## Deploys

**You will need a _Discord Developper Application_ !!**

### Deploy with docker and docker-compose

- Clone the repository
- Rename the file `.env.dist` to `.env` and fill it with the corrects informations.
- Then simply pull the repository and run `docker-compose up -d` in the root folder.

### Deploy on localhost

_To see how to deploy it in the cloud, please see the section above_  
You can start this project in a few steps :

1. Clone this directory,
2. run the command npm install,
3. download ffmpeg at [ffmpeg.org](https://www.ffmpeg.org/) and install _"ffmpeg.exe"_, _"ffplay.exe"_ and _"ffprobe.exe"_ in the root folder
4. Then rename the file '.env.dist' into '.env',
5. Once you have your accounts and the keys, replace the variables in the '.env' with your own.

You can now launch it with the command `npm start`.

## What does the bot use?

The bot uses :

- Discord.JS - [Website](https://discord.js.org/#/) - [Github repository](https://github.com/discordjs/discord.js/)
- dotenv - [dotenv on npm](https://www.npmjs.com/package/dotenv)
- ffmpeg - [website](https://www.ffmpeg.org/)
- fluent ffmpeg - [fluent-ffmpeg on npm](https://www.npmjs.com/package/fluent-ffmpeg)
- play-dl - [Github repository](https://github.com/play-dl/play-dl) - [ytdl on npm](https://www.npmjs.com/package/play-dl)
- Heroku Buildpack FFMPEG - [Github repository](https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest)

### Deploy on Heroku

_You can ~~easily~~ deploy it on Heroku with this button :_

> Since the announcement of Heroku, of the withdrawal of the freeplan, it is in my opinion more interesting to set up the bot via their service.
> However if you have a student GitHub account, you can claim 10$ of credits per month for 1 year for free.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/DestroyCom/JE-REVIENS-OF-DEVILKING)

# Made by DestCom

| Who     | Mail                                       | LinkedIn                                         | GitHub                                | Portfolio                                  |
| ------- | ------------------------------------------ | ------------------------------------------------ | ------------------------------------- | ------------------------------------------ |
| DestCom | [HERE](antoine.azevedo-da-silva@hetic.net) | [HERE](https://www.linkedin.com/in/antoine-ads/) | [HERE](https://github.com/DestroyCom) | [HERE](https://portfolio.destcom.website/) |

#### Roadmap

_See old steps of the roadmap at [archives/TODO.md](./archives/TODO.md)_

- [ ] Transform repetitive code into modules or functions [Planned for 0.9 realease]
- [ ] Add a redo play [Planned before 1.0 realease]
- [ ] Change the "Xiaomi Song" into a custom song selection & add a disabling method [Planned before 1.0 realease]
- [ ] Fix "I'll be back" features and creates a disabling method [Planned before 1.0 realease]
- [ ] Add multi-language support (English/French to start) [Planned before 1.0 realease]
- [ ] Add Smart Assistant support [No plan]
