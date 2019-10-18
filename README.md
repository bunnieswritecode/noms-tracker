# noms-tracker

## Pre-requisites

* Node.js
* npm

## Discord Bot Prep

If you haven't created a bot, follow this [guide](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) on creating one and having it join your server.

Note: This app was written to target a single server (looking at you Bloo Croo). It doesn't distinguish users across servers, so make a unique bot for your server.

## Config

Edit `config.json`.

`database`
Defines the path to the databse file used by the app.

`botToken`
Put your super secret bot token here.

## Setup

Navigate to your clone of the repo and use `npm` to install the necessary modules.

```
npm install
```

## Run

To run the app:
```
npm start
```
A prestart hook will initiatize the database.

## Bot Commands
* !help - Displays this help text 
* !next - Displays who is up next 
* !creditme - Gives your user credit 
* !paid - Marks your debt paid 
* !rotation - Displays the rotation 
* !addme - Adds your user to the rotation 
* !removeme - Permanently removes your user from the rotation

Start by having each user invoke the `!addme` command to register them into the tracker. See who is up next with `!next` (it'll also @mention them). If you've fulfilled your noms obligation, `!paid` will update the rotation and pull up the next victim.
