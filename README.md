# noms-tracker

## Pre-requisites

* Node.js
* npm

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

## Database Creation

A database creation script is included for first time deployments:

```
node createdb
```

## Run

To run the app:
```
node app
```

Alternatively, if you want output redirected to a log file:
```
node app > output.log 2>&1
```

## Notes
* App was written to target a single server (looking at you Bloo Croo). It doesn't distinguish users across servers/channels.
