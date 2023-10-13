# StroyCord

_Previously JE REVIENS OF DEVILKING_
Since the recent action of youtube to close the most used bots on discord, I wanted to create my own.

---

## How to use it ?

The bot has 4 majors commands:
_You have to add your prefix before each command (e.g. `&p [music]`)_

- `play [music url or music name]` is used to start playing music (or `p`).
- `skip` is used to skip the current music (or `s`).
- `pause` is used to pause the current music (or `pa`).
- `resume` is used to resume the current music (or `re`).
- `fuckoff` disconnects the bot and stops the music playing (or `fo`).
- `queue` display the current music queue (or `q`).

---

## Deploys

**You will need a _Discord Developper Application_ !!**

### Deploy with docker and docker-compose

#### Launch with a new mongodb server, a mongodb explorer

- Clone the repository
- Rename the file `.env.dist` to `.env` and fill it with the corrects informations.
- Then simply pull the repository and run `docker-compose up -d` in the root folder.

### Launch with a custom docker config

- Clone the repository
- Rename the file `.env.dist` to `.env` and fill it with the corrects informations.
- Create your own `docker-compose.yml`.
- Then simply pull the repository and run `docker-compose up -d` in the root folder.

### Deploy on localhost

_You will need a mongodb server_
You can start this project in a few steps :

- Clone this directory,
- run the command npm install,
- Then rename the file '.env.dist' into '.env',
- Once you have your accounts and the keys, replace the variables in the '.env' with your own.

You can now launch it with the command:

- `npm run build` to compile the bot
  then `npm run start` to start the bot
- `npm run dev` to start the bot in watch mode

---

#### ENVIRONMENT VARIABLES

| VARIABLE                   | REQUIRED | DEFAULT        | USED ONLY FOR DOCKER | DESCRIPTION                                               |
| -------------------------- | -------- | -------------- | -------------------- | --------------------------------------------------------- |
| DISCORD_TOKEN              | TRUE     |                | FALSE                | string - Your discord app token                           |
| DISCORD_CLIENT_ID          | TRUE     |                | FALSE                | string - Your discord client id                           |
| PREFIX                     | FALSE    | &              | FALSE                | string - Your bot prefix                                  |
| DETECT_FROM_ALL_MESSAGES   | FALSE    | false          | FALSE                | boolean - Used to directly detect and play a youtube link |
| -------------------------- | -------- | ------------   | -------------------- | ------------------------------------------                |
| DATABASE_CONNECTION_STRING | TRUE     |                | FALSE                | string - Your mongodb uri string                          |
| DATABASE_USER              | TRUE     |                | FALSE                | string - Your mongodb user name                           |
| DATABASE_PASSWORD          | TRUE     |                | FALSE                | string - Your mongodb user password                       |
| DATABASE_NAME              | FALSE    | stroycord      | FALSE                | string - Your mongodb database name                       |
| STROYCORD_LOGO             | FALSE    | StroyCord Logo | FALSE                | string - The avatar url you want to give to the bot       |
| LANGUAGE                   | FALSE    | en-US          | FALSE                | string - The bot language                                 |
| -------------------------- | -------- | ------------   | -------------------- | ------------------------------------------                |
| LOG_DIR                    | FALSE    | /log           | TRUE                 | string - Your logging directory path use for docker       |
| TIMEZONE                   | FALSE    | Europe/Paris   | TRUE                 | string - Your container timezone                          |
