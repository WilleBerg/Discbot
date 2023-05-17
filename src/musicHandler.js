const ytdl = require("ytdl-core");
const fetch = require("node-fetch");
const ply = require("play-dl");

const { 
    joinVoiceChannel,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
} = require("@discordjs/voice");

const { currentDirectory } = require("./commandConfig.json");
const { googleApi } = require(`${currentDirectory}/config.json`);

const { log, alwaysLog } = require("./logging.js");

const GOOGLE_API_URL = 'https://www.googleapis.com/youtube/v3/search?';
const YOUTUBE_URL = 'https://www.youtube.com/watch?';

const PEPEJAM_EMOTE = '<a:pepeJAM:852902332164603935>';
const PEEPOLEAVE_EMOTE = '<a:peepoLeave:852903257256755250>';

/**
* Starts the process for playing music in a voice channel
* @param {Message} message 
* @param {queue} serverQueue 
*/
async function execute(message, serverQueue, queue) {
    alwaysLog(`Will try to execute ${message.content}`);
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    let tmp = "";
    for (let i = 0; i < args.length; i++) {
        if (i != 0) tmp += args[i] + " ";
    }
    let args2 = await getVideoUrl(tmp);
    console.log(args2);
    let songInfo;
    try {
        songInfo = await ytdl.getInfo(args2);
    } catch (error) {
        console.error(error);
        return message.channel.send("Could not find video");
    }
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
            playing: true,
            player: null,
            guild: message.guild,
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.channel.guild.id,
                adapterCreator: message.channel.guild.voiceAdapterCreator,
            });
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0], connection, queue);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(
            `**${song.title}** has been added to the queue!`
        );
    }
}

async function getVideoUrl(searchValue) {
    log("Searching for video url...");
    const { items } = await fetch(
        `${GOOGLE_API_URL}q=${searchValue}&key=${googleApi}`
    ).then((respone) => respone.json());
    return `${YOUTUBE_URL}v=${items[0].id.videoId}`;
}

/*
 * Skips the currently playing song.
* @param {Message} message 
* @param {queue} serverQueue 
*/
async function skip(message, serverQueue) {
    alwaysLog("skipping");
    if (!message.member.voice.channel) {
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    }
    if (!serverQueue) {
        return message.channel.send("There is no song that I could skip!");
    }
    let rec = await getNextResource(serverQueue);
    if (rec != undefined) {
        serverQueue.player.play(rec);
        serverQueue.textChannel.send(
            `Skipping song.\nNext up is ` + 
            `**${serverQueue.songs[0].title}**${PEPEJAM_EMOTE}`
        );
    } else {
        serverQueue.connection.destroy();
        serverQueue.textChannel.send(
            `Queue empty!\nIm leaving ${PEEPOLEAVE_EMOTE}`
        );
        queue.delete(serverQueue.guild.id);
    }
}

/*
* Starts playing the next song in the queue.
* @param {Guild} guild 
* @param {Song} song 
* @param {VoiceConnection} connection
* @param {queue} queue 
*/
async function play(guild, song, connection, queue) {
    alwaysLog(`Starting to play ${song.title}`);
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const stream = await ply.stream(song.url);
    const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
    });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);
    serverQueue.player = player;

    player.on(AudioPlayerStatus.Idle, async () => {
        const rec = await getNextResource(serverQueue);

        if (rec != undefined) {
            player.play(rec);
            serverQueue.textChannel.send(
                `Now playing: ` + 
                `**${serverQueue.songs[0].title}**${PEPEJAM_EMOTE}`
            );
        } else {
            connection.destroy();
            serverQueue.textChannel.send(
                `Queue empty!\nIm leaving${PEEPOLEAVE_EMOTE}`
            );
            queue.delete(guild.id);
        }
    });
    player.on("error", (error) => {
        console.error(error.message);
        log(error.message);
        connection.destroy();
        serverQueue.textChannel.send(
            `Error: **${error.message}** ${SADGE_EMOTE} ` + 
            `\nDestroying connection`
        );
        queue.delete(serverQueue.voiceChannel.guild.id);
        return;
    });
    serverQueue.textChannel.send(
        `Start playing: **${song.title}**${PEPEJAM_EMOTE}`
    );
}

async function getNextResource(serverQueue) {
    log("shifting queue...");
    serverQueue.songs.shift();
    log("creating stream...");
    if (serverQueue.songs[0] != undefined) {
        const stream = await ply.stream(serverQueue.songs[0].url);
        log("creating audio resource...");
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });
        log("returning resource, will try playing...");
        return resource;
    } else return undefined;
}

/*
* Stops playing music and empties the queue.
* @param {Message} message 
* @param {queue} serverQueue 
* @param {queue} queue 
*/
function stop(message, serverQueue, queue) {
    alwaysLog("Stopping music");
    if (!message.member.voice.channel) {
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    }

    if (!serverQueue) {
        return message.channel.send("There is no song that I could stop!");
    }

    serverQueue.connection.destroy();
    queue.delete(serverQueue.voiceChannel.guild.id);
    return message.channel.send("Stopping!\nQueue has been emptied.");
}
/*
    * Clears the queue.
    * @param {queue} serverQueue 
    * @param {Message} message 
    * @returns 
*/
function clearQueue(serverQueue) {
    alwaysLog("Clearing queue");
    if (serverQueue != undefined) {
        serverQueue.songs = [];
        serverQueue.textChannel.send("Queue has been cleared!");
    }
}

/*
    * Removes a song from the queue.
    * @param {Message} message
    * @param {queue} serverQueue
    * @returns 
*/
function removeFromQueue(message, serverQueue) {
    alwaysLog(`Will try to remove ${message.content}`);
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send(
            "You need to be in a voice channel to remove from the queue!"
        );
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    if (
        !isNaN(args[1]) &&
        serverQueue != undefined &&
        serverQueue.songs.length > args[1] &&
        args[1] > 0
    ) {
        console.log("Current queue length" + serverQueue.songs.length);
        let emptyList = [];
        let songToRemove = serverQueue.songs[args[1]];
        for (let i = 0; i < serverQueue.songs.length; i++) {
            if (serverQueue.songs[i].title != songToRemove.title) {
                emptyList.push(serverQueue.songs[i]);
            }
        }
        serverQueue.songs = emptyList;
        message.channel.send(`Removed **${songToRemove.title}** from queue!`);
    } else {
        message.channel.send("Invalid number!");
    }
}

module.exports = { execute, skip, stop, clearQueue, removeFromQueue };
