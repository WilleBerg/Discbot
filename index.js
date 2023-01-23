// PACKAGES
const fs = require("fs");
const fetch = require("node-fetch");
const ytdl = require("ytdl-core");
const ply = require("play-dl");

// DISCORDJS
const { Client, Collection, Intents, VoiceChannel } = require("discord.js");
const { token, prefix, googleApi, indexDebug, lastfmDebug, userHandlerDebug } = require("./config.json");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    ],
    partials: ["CHANNEL"],
});

const {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
} = require("@discordjs/voice");

// IMPORTED FUNCTIONS
const { getNextScheduleEvent, getNextTime } = require("./scheduleMessage");
const { sendBoop, boop } = require("./welcomeMessage");
const {
    checkUser,
    registerUser,
    connect,
    close,
    userAllowAccess,
    setSessionKey,
    getSessionKey,
} = require("./userHandler.js");
const {
    getRecentTracks,
    scrobbleSong,
    updateNowPlaying,
    scrobbleSongs,
    testScrobbles,
} = require("./lastfm.js");

// TODO TODO TODO TDOOD
// CHANGE WAY OF DOING THIS PLSSS
const DEBUGGING = indexDebug;

let timer = 0;
let updateTimer = 0;
var sendMessage = false;

client.commands = new Collection();

const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const queue = new Map();
var scrobblers = [];

client.once("ready", async () => {
    await connect();
    fs.appendFile("./log/log.log", "Bot started!\n", (err) => {
        if (err) console.log("error", err);
    });
    alwaysLog(`Bot is ready!`);
    setInterval(() => {
        if (timer > 0) {
            timer -= 1000;
        } else {
            log("Timer has expired!");
            //var channel = client.channels.cache.get("959114050275524728");
            updateScrobblers();

            //channel.send({embeds: [getNextScheduleEvent()]});
            timer = 1000 * 10;
        }
        if (updateTimer > 0) {
            updateTimer -= 1000;
        } else {
            updateTimer = 1000 * 60 * 5;
            if (scrobblers.length > 0) {
                // Add these to function instead
                sendMessage = true;
                alwaysLog("");
                alwaysLog("UPDATE MESSAGE");
                alwaysLog("");
                alwaysLog("Current scrobblers: " + scrobblers.length);
                var message = createUpdateMessage(scrobblers);
                for (let i = 0; i < message.length; i++) {
                    alwaysLog(message[i]);
                }
                alwaysLog("");
            } else {
                if (sendMessage) {
                    alwaysLog("No scrobblers");
                    sendMessage = false;
                }
            }
        }
    }, 1000);
});

function createUpdateMessage(scrobblers) {
    if (scrobblers.length == 0) return ["No scrobblers"];
    var space = " ";
    var numberSign = "#";
    var newLine = "\n";
    var longestMessage = 0;
    for (let i = 0; i < scrobblers.length; i++) {
        var currentMessage = `${i + 1}${space}${
            scrobblers[i]["user"].username
        }${space}is scrobbling${space}${
            scrobblers[i]["userToListen"]
        }'s songs. Time left: ${
            scrobblers[i]["timeout"] / 1000
        } seconds until timeout.`;
        if (currentMessage.length > longestMessage) {
            longestMessage = currentMessage.length;
        }
    }
    var numberSignRow = "#";
    for (let i = 0; i < longestMessage + 4; i++) {
        numberSignRow += numberSign;
    }
    //numberSignRow += numberSign;
    var message = [numberSignRow];
    for (let i = 0; i < scrobblers.length; i++) {
        var currentMessage = `${i + 1}.${space}${
            scrobblers[i]["user"].username
        }${space}is scrobbling${space}${
            scrobblers[i]["userToListen"]
        }'s songs. Time left: ${
            scrobblers[i]["timeout"] / 1000
        } seconds until timeout.`;
        var spaces = longestMessage - currentMessage.length;
        //alwaysLog("Spaces: " + spaces + "for message: " + currentMessage);
        for (let j = 0; j < spaces; j++) {
            currentMessage += space;
        }
        if (spaces > 0) currentMessage += space;
        message.push(numberSign + space + currentMessage + space + numberSign);
    }
    message.push(numberSignRow);
    return message;
}

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("guildMemberAdd", (member) => {
    if (member.guild.id == "982289016672120852") {
        sendBoop(member, member.guild.channels.cache.get("982300142726156399"));
    }
});

client.on("messageCreate", async (message) => {
    log(
        `Message received: ${message.content} : ${message.author.username} : ${message.channel.type}`
    );
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    // respond to private message
    if (message.channel.type == "DM") {
        log("Private message");
        log(message.content);
        try {
            handleMessage(message, null);
        } catch (error) {
            alwaysLog("Error in private message: ");
            alwaysLog(error);
        }
    } else {
        const serverQueue = queue.get(message.guild.id);
        handleMessage(message, serverQueue);
    }
});
// Responed to private message

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

function handleMessage(message, serverQueue) {
    // TODO: Redo this please
    // Perhaps a for-loop, just looping through commands?
    // But how to call correct function?
    alwaysLog(
        `Will try to handle ${message.content} from user ${message.author.username}`
    );
    if (serverQueue == null) {
        alwaysLog("Server queue is null, assuming private message");
    }
    // !play
    if (message.content.startsWith(`${prefix}play`) && serverQueue != null) {
        execute(message, serverQueue);
        return;
    }
    // !skip
    else if (
        message.content.startsWith(`${prefix}skip`) &&
        serverQueue != null
    ) {
        skip(message, serverQueue);
        return;
    }
    // !stop
    else if (
        message.content.startsWith(`${prefix}stop`) &&
        serverQueue != null
    ) {
        stop(message, serverQueue);
        return;
    }
    // !queue
    else if (message.content.startsWith(`${prefix}q`) && serverQueue != null) {
        printQueue(message, serverQueue);
    }
    // !raindance
    else if (
        message.content.startsWith(`${prefix}raindance`) &&
        serverQueue != null
    ) {
        message.content = "!play https://www.youtube.com/watch?v=aMTLs4qfJtI";
        execute(message, serverQueue);
    }
    // !soviet
    else if (
        message.content.startsWith(`${prefix}soviet`) &&
        serverQueue != null
    ) {
        message.content = "!play https://www.youtube.com/watch?v=U06jlgpMtQs";
        execute(message, serverQueue);
    }
    // !credits
    else if (message.content.startsWith(`${prefix}credits`)) {
        message.channel.send(
            "<:gigachad:852944386816081990>@sylt<:gigachad:852944386816081990>"
        );
    }
    // !help
    else if (message.content.startsWith(`${prefix}help`)) {
        message.channel.send(
            "**!play** songName or Url - to play song\n" +
                "**!skip** - to skip current song\n" +
                "**!stop** - to stop bot completely\n" +
                "**!q** to get current queue\n" +
                "**!clearq** - to clear the queue\n" +
                "**!remove** number - to remove specific song from queue\n" +
                "**!lfmhelp** - to get help with last.fm commands and setup\n" +
                "**!credits**"
        );
    }
    // !lfmhelp
    else if (message.content.startsWith(`${prefix}lfmhelp`)) {
        message.channel.send(
            "Setup:\n1. **!register** - to register your discord on this bots database.\nThe bot only saves your username and id from your discord account.\n" +
                "2. **!allowaccess** - to allow the bot to scrobble your songs. Follow the link provided and accept before next step\n" +
                "3. **!setuplastfm** - to setup your lastfm account with the bot.\n" +
                "After setup you can use the following commands:\n" +
                '**!duescrobble "lastFmUser"** to scrobble songs from that user to your account\n' +
                "**!scrobblestop** to stop scrobbling songs from that user to your account\n"
        );
    }
    // !clearq
    else if (message.content.startsWith(`${prefix}clearq`)) {
        clearQueue(serverQueue);
    }
    // !remove
    else if (message.content.startsWith(`${prefix}remove`)) {
        removeFromQueue(message, serverQueue);
    }
    // !kill
    else if (message.content.startsWith(`${prefix}kill`)) {
        if (message.author.id == "70999889231753216") {
            exit(message);
        } else {
            message.channel.send(
                "You don't have permission to do that!<:pepeLaugh2:852905715676872765>"
            );
        }
    }
    // !scrobblestatus
    else if (message.content.startsWith(`${prefix}scrobblestatus`)) {
        if (message.author.id == "70999889231753216") {
            var message0 = createUpdateMessage(scrobblers);
            var message1 = "```";
            for (let i = 0; i < message0.length; i++) {
                message1 += message0[i] + "\n";
            }
            message1 += "```";
            message.channel.send(message1);
        } else {
            message.channel.send(
                "You don't have permission to do that!<:pepeLaugh2:852905715676872765>"
            );
        }
    }
    // !boop
    else if (message.content.startsWith(`${prefix}boop`)) {
        boop(message.channel);
    }
    // !register
    else if (message.content.startsWith(`${prefix}register`)) {
        register(message);
    }
    // !allowaccess
    else if (message.content.startsWith(`${prefix}allowaccess`)) {
        allowAccess(message);
    }
    // !setuplastfm
    else if (message.content.startsWith(`${prefix}setuplastfm`)) {
        setupLastFM(message);
    }
    // !duoscrobble
    else if (message.content.startsWith(`${prefix}duoscrobble`)) {
        duoscrobble(message);
    }
    // !scrobblestop
    else if (message.content.startsWith(`${prefix}scrobblestop`)) {
        stopscrobbling(message);
    }
    // !ems
    else if (message.content.startsWith(`${prefix}ems`)) {
        if (
            message.author.id != "536906681570033664" &&
            message.author.id != "70999889231753216"
        )
            return;
        var mess = message.content.split(" ");
        var content = "";
        if (mess.length != 1 || mess.length > 2) {
            content = "!duoscrobble sylt_-";
        } else {
            content = "!duoscrobble sylt_- " + mess[1];
        }
        var newMessage = {
            author: { id: "536906681570033664", username: "emmy" },
            content: content,
            channel: message.channel,
        };
        duoscrobble(newMessage);
    }
    // !wbs
    else if (message.content.startsWith(`${prefix}wbs`)) {
        if (
            message.author.id != "536906681570033664" &&
            message.author.id != "70999889231753216"
        )
            return;
        var mess = message.content.split(" ");
        var content = "";
        if (mess.length != 1 || mess.length > 2) {
            content = "!duoscrobble teitan-";
        } else {
            content = "!duoscrobble teitan- " + mess[1];
        }
        var newMessage = {
            author: { id: "70999889231753216", username: "sylt" },
            content: content,
            channel: message.channel,
        };
        duoscrobble(newMessage);
    }
    // !es
    else if (message.content.startsWith(`${prefix}es`)) {
        if (
            message.author.id == "536906681570033664" ||
            message.author.id == "70999889231753216"
        ) {
            var newMessage = {
                author: { id: "536906681570033664", username: "emmy" },
                content: message.content,
                channel: message.channel,
            };
            stopscrobbling(newMessage);
        }
    }
    // !ws
    else if (message.content.startsWith(`${prefix}ws`)) {
        if (
            message.author.id != "536906681570033664" ||
            message.author.id != "70999889231753216"
        ) {
            var newMessage = {
                author: { id: "70999889231753216", username: "sylt" },
                content: message.content,
                channel: message.channel,
            };
            stopscrobbling(newMessage);
        }
    }
    // !multiscrobble
    else if (message.content.startsWith(`${prefix}multiscrobble`)) {
        multiScrobbler(message);
    }
    // !latestscrobbles
    else if (message.content.startsWith(`${prefix}ls`)) {
        latestScrobbles(message);
    }
    // !kachow
    // ty copilot
    else if (message.content.startsWith(`${prefix}kachow`)) {
        message.channel.send(
            "https://tenor.com/view/kachow-cars-insane-kachow-gif-20913646"
        );
    } else {
        message.channel.send("You need to enter a valid command!");
    }
}

async function latestScrobbles(message) {
    var mess = message.content.split(" ");
    if (mess.length > 3) {
        message.channel.send(
            "You need to enter a valid command! You need to enter a username!"
        );
        return;
    }
    var user = mess[1];
    var amount;
    if (mess.length == 3 && !isNaN(mess[2])) {
        amount = mess[2];
        if (amount > 200) {
            message.channel.send("You can only get 200 scrobbles at a time!");
            amount = 200;
        }
    } else {
        amount = 50;
    }
    var recentTracks;
    var mostRecentTrack;
    var tracks;
    try {
        recentTracks = await getRecentTracks(user, 200);
        if (recentTracks == null || recentTracks == undefined) {
            message.channel.send(
                "You need to enter a valid command! The user you entered does not have any recent tracks!"
            );
            return;
        }
        tracks = recentTracks.recenttracks.track;
        mostRecentTrack = tracks[0];
    } catch (error) {
        message.channel.send(
            "You need to enter a valid command! The user you entered does not have any recent tracks!"
        );
        return;
    }
    var start = 0;
    var isPlaying =
        mostRecentTrack["@attr"] != null &&
        mostRecentTrack["@attr"]["nowplaying"] == "true";
    if (isPlaying) {
        log("User is playing a song!");
        start += 1;
        amount++;
        // Since the most recent track is not playing, we need to start at the second most recent track
        // However end should still be the same if end == 50
        //end += 1;
        var msg = "\n";
        for (var i = start; i < amount; i++) {
            var date = new Date(tracks[i].date.uts * 1000);
            if (
                msg.length +
                    (
                        i +
                        ". " +
                        tracks[i].artist["#text"] +
                        " - " +
                        tracks[i].name +
                        " at " +
                        date.toLocaleString() +
                        "\n"
                    ).length >
                2000
            ) {
                await message.channel.send(msg);
                msg = "\n";
            }
            msg +=
                i +
                ". " +
                tracks[i].artist["#text"] +
                " - " +
                tracks[i].name +
                " at " +
                date.toLocaleString() +
                "\n";
        }
        await message.channel.send(msg);
        return;
    }
    var msg = "\n";
    for (var i = 0; i < amount; i++) {
        var date = new Date(tracks[i].date.uts * 1000);
        if (
            msg.length +
                (
                    i +
                    ". " +
                    tracks[i].artist["#text"] +
                    " - " +
                    tracks[i].name +
                    " at " +
                    date.toLocaleString() +
                    "\n"
                ).length >
            2000
        ) {
            await message.channel.send(msg);
            msg = "\n";
        }
        msg +=
            i +
            1 +
            ". " +
            tracks[i].artist["#text"] +
            " - " +
            tracks[i].name +
            " at " +
            date.toLocaleString() +
            "\n";
    }
    await message.channel.send(msg);
    return;
}

async function multiScrobbler(message) {
    var mess = message.content.split(" ");
    // if (mess.length != 3) {
    //     message.channel.send(
    //         "You need to enter a valid command! You need to enter a username and a song range! You are missing something!"
    //     );
    //     return;
    // }
    // split the message into the username and the song range seperated by dash
    var user = mess[1];
    var songRangesRaw = [];
    for (var i = 2; i < mess.length; i++) {
        songRangesRaw.push(mess[i]);
    }
    var songRanges = [];
    try {
        for (var i = 0; i < songRangesRaw.length; i++) {
            var songRange = songRangesRaw[i].split("-");
            if (songRange.length != 2) {
                message.channel.send(
                    "You need to enter a valid command! Your range is invalid!"
                );
                return;
            }
            var start = parseInt(songRange[0]);
            var end = parseInt(songRange[1]);
            if (isNaN(start) || isNaN(end)) {
                message.channel.send("You need to enter a valid command!");
                return;
            }
            if (start > end) {
                message.channel.send(
                    "You need to enter a valid command! Your range is invalid!"
                );
                return;
            }
            log("Song range: " + songRange)
            songRanges.push(songRange);
        }
    } catch {
        message.channel.send("You need to enter a valid command! Something is wrong with your song ranges!");
        return;
    }
    var recentTracks;
    var mostRecentTrack;
    var tracks;
    try {
        recentTracks = await getRecentTracks(user, 200, 1);
        if (recentTracks == null || recentTracks == undefined) {
            message.channel.send(
                "You need to enter a valid command! The user you entered does not have any recent tracks!"
            );
            return;
        }
        tracks = recentTracks.recenttracks.track;
        mostRecentTrack = tracks[0];
    } catch (error) {
        message.channel.send(
            "You need to enter a valid command! The user you entered does not have any recent tracks!"
        );
        return;
    }
    log("Song ranges: " + songRanges);
    var scrobbleList = [];
    var set = new Set();
    for (var i = 0; i < songRanges.length; i++) {
        var start = parseInt(songRanges[i][0]);
        var end = parseInt(songRanges[i][1]);
        log("Start: " + start + " End: " + end)
        var isPlaying =
        mostRecentTrack["@attr"] != null &&
        mostRecentTrack["@attr"]["nowplaying"] == "true";
        if (!isPlaying) {
            log("User is not playing a song!");
            start -= 1;
            end -= 1;
        }
        if (tracks.length < end) {
            message.channel.send(
                "You need to enter a valid command! The user you entered does not have that many recent tracks!"
            );
            return;
        }
        for (var j = start; j <= end; j++) {
            if (set.has(j)) continue;
            scrobbleList.push(tracks[j]);
            log(JSON.stringify(tracks[j].name));
            set.add(j);
        }
    }
    //get session key
    var sessionKey = await getSessionKey(message.author);
    if (sessionKey == false) {
        message.channel.send(
            "You do not have a valid session key! Please redo the lastFM setup process!"
        );
        return;
    }
    log("Session key: " + sessionKey);
    log("Scrobbling songs: ");
    var songs = [];
    var albums = [];
    var artists = [];
    var timestamps = [];
    var results = [];
    var counter = 0;
    for (var i = 0; i < scrobbleList.length; i++) {
        log(
            "Scrobbling: " +
                scrobbleList[i].artist["#text"] +
                " - " +
                scrobbleList[i].name
        );
        songs.push(scrobbleList[i].name);
        albums.push(scrobbleList[i].album["#text"]);
        artists.push(scrobbleList[i].artist["#text"]);
        timestamps.push(scrobbleList[i].date.uts);
        if (counter == 49 || i == scrobbleList.length - 1) {
            var result = await scrobbleSongs(
                songs,
                artists,
                albums,
                timestamps,
                sessionKey
            );
            results.push(result);
            songs = [];
            albums = [];
            artists = [];
            timestamps = [];
            counter = 0;
        }
        counter++;
    }
    //var result1 = await scrobbleSong(songs[0], artists[0], albums[0], timestamps[0], sessionKey);
    //log("Result: " + JSON.stringify(result1));

    // create a 2d matrix with every binary combination from 0 - 31
    // var combinations = [
    // [0, 0, 0, 0, 0],
    // [0, 0, 0, 0, 1],
    // [0, 0, 0, 1, 0],
    // [0, 0, 0, 1, 1],
    // [0, 0, 1, 0, 0],
    // [0, 0, 1, 0, 1],
    // [0, 0, 1, 1, 0],
    // [0, 0, 1, 1, 1],
    // [0, 1, 0, 0, 0],
    // [0, 1, 0, 0, 1],
    // [0, 1, 0, 1, 0],
    // [0, 1, 0, 1, 1],
    // [0, 1, 1, 0, 0],
    // [0, 1, 1, 0, 1],
    // [0, 1, 1, 1, 0],
    // [0, 1, 1, 1, 1],
    // [1, 0, 0, 0, 0],
    // [1, 0, 0, 0, 1],
    // [1, 0, 0, 1, 0],
    // [1, 0, 0, 1, 1],
    // [1, 0, 1, 0, 0],
    // [1, 0, 1, 0, 1],
    // [1, 0, 1, 1, 0],
    // [1, 0, 1, 1, 1],
    // [1, 1, 0, 0, 0],
    // [1, 1, 0, 0, 1],
    // [1, 1, 0, 1, 0],
    // [1, 1, 0, 1, 1],
    // [1, 1, 1, 0, 0],
    // [1, 1, 1, 0, 1],
    // [1, 1, 1, 1, 0],
    // [1, 1, 1, 1, 1],
    // ];
    // for (var i = 0; i < combinations.length; i++) {
    //     var resul = await testScrobbles(songs, artists, albums, timestamps, sessionKey, combinations[i][0], combinations[i][1], combinations[i][2], combinations[i][3], combinations[i][4]);
    //     if (resul == false) continue;
    //     log("Result: " + JSON.stringify(resul));
    // }

    for (var i = 0; i < results.length; i++) {
        if (results[i] == "error") {
            message.channel.send(
                "Something went wrong while scrobbling the songs!"
            );
            return;
        } else if (results[i] == "invalidsession") {
            message.channel.send(
                "Your session key is invalid! Please redo the lastFM setup process!"
            );
            return;
        }
    }
    var msg = [];
    var tmpMsg = "";
    for (var i = 0; i < scrobbleList.length; i++) {
        if (
            tmpMsg.length +
                (
                    i +
                    ". " +
                    scrobbleList[i].artist["#text"] +
                    " - " +
                    scrobbleList[i].name +
                    "\n"
                ).length >
            2000
        ) {
            msg.push(tmpMsg);
            tmpMsg = "";
        }
        tmpMsg +=
            i +
            1 +
            ". " +
            scrobbleList[i].artist["#text"] +
            " - " +
            scrobbleList[i].name +
            "\n";
    }
    msg.push(tmpMsg);
    message.channel.send("Scrobbles successful!\nScrobbled songs:\n");
    for (var i = 0; i < msg.length; i++) {
        log("Sending message: " + msg[i]);
        await message.channel.send(msg[i]);
    }
    return;
}

async function updateScrobblers() {
    for (var i = 0; i < scrobblers.length; i++) {
        if (scrobblers[i].remove) {
            scrobblers.splice(i, 1);
            if (scrobblers.length == 0) {
                alwaysLog("No more scrobblers, stopping interval");
                break;
            }
            i--;
        }
        scrobblers[i].timeout -= 1000 * 10;
        if (scrobblers[i].timeout <= 0) {
            scrobblers[i].remove = true;
            alwaysLog(`Scrobbler ${scrobblers[i].username} timed out`);
        }
        log(`Current user: ${JSON.stringify(scrobblers[i])}`);
        var userToListen = scrobblers[i]["userToListen"];
        var sessionKey = scrobblers[i]["sessionKey"];
        var userLastScrobbled = scrobblers[i]["lastScrobbledTrack"];

        var recentTracks = await getRecentTracks(userToListen, 3, 1);
        if (recentTracks == "error") {
            alwaysLog(
                `Error getting recent tracks for ${userToListen}, check lastfmLog.log for more info`
            );
            continue;
        }
        log("\nJSON INCOMING\n\n\n");
        log(
            "Recent tracks: " +
                JSON.stringify(recentTracks) +
                " for user " +
                scrobblers[i]["user"].username
        );
        log("\nJSON DONE\n\n\n");
        if (recentTracks == null) {
            log("Recent tracks is null");
            continue;
        }
        try {
            var mostRecentTrack = recentTracks["recenttracks"]["track"][0];
            var isPlaying =
                mostRecentTrack["@attr"] != null &&
                mostRecentTrack["@attr"]["nowplaying"] == "true";
            var secondMostRecentTrack =
                recentTracks["recenttracks"]["track"][1];
        } catch (err) {
            alwaysLog("Error: " + err);
            continue;
        }

        log("\nJSON INCOMING\n\n\n");
        log("Most recent track: " + JSON.stringify(mostRecentTrack));
        log("\nJSON DONE\n\n\n");

        log("\nJSON INCOMING\n\n\n");
        log(
            "Second most recent track: " + JSON.stringify(secondMostRecentTrack)
        );
        log("\nJSON DONE\n\n\n");

        try {
            if (isPlaying) {
                log("User is playing");
                var trackName = mostRecentTrack["name"];
                var artistName = mostRecentTrack["artist"]["#text"];
                var albumName = mostRecentTrack["album"]["#text"];

                var result = await updateNowPlaying(
                    trackName,
                    artistName,
                    albumName,
                    sessionKey
                );
                if (
                    result["message"] != null &&
                    result["message"].startsWith("Invalid session key")
                ) {
                    scrobblers[i]["user"].send(
                        "Your session key is invalid, please re-register your LastFM account with the bot"
                    );
                    scrobblers[i].remove = true;
                    continue;
                }
                if (result == "error") {
                    alwaysLog("Error updating now playing");
                    alwaysLog("Check lastfmLog.log file for more info");
                    continue;
                }
                log(
                    "Updated now playing for user " +
                        scrobblers[i]["user"].username
                );
                var resultScrobble = tryScrobble(
                    secondMostRecentTrack,
                    userLastScrobbled,
                    sessionKey,
                    scrobblers[i]["user"].username,
                    scrobblers[i].isFirstScrobble
                );
                if (resultScrobble || userLastScrobbled == null) {
                    scrobblers[i].isFirstScrobble = false;
                    scrobblers[i]["lastScrobbledTrack"] = secondMostRecentTrack;
                } else continue;
            } else {
                var resultScrobble = tryScrobble(
                    secondMostRecentTrack,
                    userLastScrobbled,
                    sessionKey,
                    scrobblers[i]["user"].username
                );
                if (resultScrobble) {
                    scrobblers[i].isFirstScrobble = false;
                    scrobblers[i]["lastScrobbledTrack"] = secondMostRecentTrack;
                } else continue;
            }
        } catch (err) {
            alwaysLog("Error: " + err);
            continue;
        }
    }
}

function tryScrobble(
    secondMostRecentTrack,
    userLastScrobbled,
    sessionKey,
    username,
    isFirstScrobble
) {
    if (isSameScrobble(secondMostRecentTrack, userLastScrobbled)) {
        log("Same scrobble as last time");
        return false;
    } else {
        if (isFirstScrobble) {
            return true;
        }
        alwaysLog("Different scrobble than last time");
        var res = scrobbleSong(
            secondMostRecentTrack["name"],
            secondMostRecentTrack["artist"]["#text"],
            secondMostRecentTrack["album"]["#text"],
            secondMostRecentTrack["date"]["uts"],
            sessionKey
        );
        if (res != "error") {
            alwaysLog(
                "Scrobbled track " +
                    secondMostRecentTrack["name"] +
                    " for user " +
                    username
            );
        } else {
            alwaysLog(
                "Error scrobbling track " +
                    secondMostRecentTrack["name"] +
                    " for user " +
                    username
            );
            alwaysLog("Check the lastfmLog.log file for more info");
        }
        return true;
    }
}

function isSameScrobble(track1, track2) {
    var isNull1 = track1 == null;
    var isNull2 = track2 == null;
    if (isNull1 || isNull2) return false;
    var isSameName = track1["name"] == track2["name"];
    var isSameArtist = track1["artist"]["#text"] == track2["artist"]["#text"];
    var isSameAlbum = track1["album"]["#text"] == track2["album"]["#text"];
    var isSameTime = track1["date"]["uts"] == track2["date"]["uts"];
    return isSameName && isSameArtist && isSameAlbum && isSameTime;
}

async function stopscrobbling(message) {
    alwaysLog(`Will try to stop scrobbling for ${message.author.username}`);
    await message.channel.send("Will try to stop scrobbling for you!");
    for (let i = 0; i < scrobblers.length; i++) {
        if (scrobblers[i]["_id"] == message.author.id) {
            scrobblers.splice(i, 1);
            alwaysLog(`Removed ${message.author.username} from scrobblers`);
            await message.channel.send(
                `Stopped scrobbling for user ${message.author.username}`
            );
            return;
        }
    }
}

async function duoscrobble(message) {
    var args = message.content.split(" ");
    if (args.length < 2) {
        await message.channel.send("You need to enter a valid username!");
        return;
    }
    var userToListen = args[1];
    alwaysLog(
        `Will try to scrobble ${userToListen}'s songs for ${message.author.username}`
    );
    var newScrobbler = {
        user: message.author,
        userToListen: userToListen,
        lastScrobbledTrack: null,
        sessionKey: await getSessionKey(message.author),
        isFirstScrobble: true,
        _id: message.author.id,
        remove: false,
        timeout: 1000 * 60 * 60 * 5,
    };
    scrobblers.push(newScrobbler);
    timer = 0;
    await message.channel.send(
        `Will try to scrobble ${userToListen}'s songs for ${message.author.username}`
    );
}

async function setupLastFM(message) {
    const resp = await setSessionKey(message.author);
    if (resp == true) {
        message.channel.send(
            "You have successfully set up your LastFM account!\n" +
                'You should now be able to use **!duoscrobble** "**userToDuoScrobble**"'
        );
    } else {
        message.channel.send("Something went wrong");
    }
}

async function allowAccess(message) {
    var allowAccessResult = await userAllowAccess(message);
    if (!allowAccessResult) {
        message.channel.send("Something went wrong!");
    }
}

async function register(message) {
    var userCheck = await checkUser(message.author);
    if (userCheck == true) {
        log("User exists!");
        await message.channel.send("User exists!");
    } else if (userCheck == false) {
        log("User doesn't exist!");
        await message.channel.send("User doesn't exist, will try registering!");
        var userRegistrationResult = await registerUser(message.author);
        if (userRegistrationResult == true) {
            alwaysLog("User registered!");
            await message.channel.send("User registered!");
        } else {
            alwaysLog("User registration failed!");
            await message.channel.send("User registration failed!");
        }
    } else {
        alwaysLog("Error!");
        await message.channel.send("Error!");
    }
}

async function exit(message) {
    alwaysLog("Exiting...");
    await close();
    await message.channel.send("You killed me! <:Sadge:852903092315357204>");
    client.destroy();
    process.exit();
}

function removeFromQueue(message, serverQueue) {
    alwaysLog(`Will try to remove ${message.content}`);
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to remove from the queue!"
        );
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

function clearQueue(serverQueue) {
    alwaysLog("Clearing queue");
    if (serverQueue != undefined) {
        serverQueue.songs = [];
        serverQueue.textChannel.send("Queue has been cleared!");
    }
}

function printQueue(message, serverQueue) {
    alwaysLog("Printing queue");
    if (serverQueue != undefined) {
        let songString = "";
        let counter = 1;
        for (let i = 1; i < serverQueue.songs.length; i++) {
            if (serverQueue.songs[i].title != undefined) {
                songString +=
                    "\n**" + counter + ". " + serverQueue.songs[i].title + "**";
                counter++;
            }
        }
        if (songString == "") serverQueue.textChannel.send("Song queue empty!");
        else message.channel.send("Song queue:" + songString);
    } else {
        message.channel.send(
            "Song queue empty or bot is broken <:Sadge:852903092315357204>"
        );
    }
}

async function execute(message, serverQueue) {
    alwaysLog(`Will try to execute ${message.content}`);
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );
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
            play(message.guild, queueContruct.songs[0], connection);
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

async function skip(message, serverQueue) {
    alwaysLog("skipping");
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("There is no song that I could skip!");
    let rec = await getNextResource(serverQueue);
    if (rec != undefined) {
        serverQueue.player.play(rec);
        serverQueue.textChannel.send(
            `Skipping song.\nNext up is **${serverQueue.songs[0].title}**<a:pepeJAM:852902332164603935>`
        );
    } else {
        serverQueue.connection.destroy();
        serverQueue.textChannel.send(
            `Queue empty!\nIm leaving<a:peepoLeave:852903257256755250>`
        );
        queue.delete(serverQueue.guild.id);
    }
}

function stop(message, serverQueue) {
    alwaysLog("Stopping music");
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue)
        return message.channel.send("There is no song that I could stop!");

    serverQueue.connection.destroy();
    queue.delete(serverQueue.voiceChannel.guild.id);
    return message.channel.send("Stopping!\nQueue has been emptied.");
}

async function play(guild, song, connection) {
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
                `Now playing: **${serverQueue.songs[0].title}**<a:pepeJAM:852902332164603935>`
            );
        } else {
            connection.destroy();
            serverQueue.textChannel.send(
                `Queue empty!\nIm leaving<a:peepoLeave:852903257256755250>`
            );
            queue.delete(guild.id);
        }
    });
    player.on("error", (error) => {
        console.error(error.message);
        log(error.message);
        connection.destroy();
        serverQueue.textChannel.send(
            `Error: **${error.message}** <:Sadge:852903092315357204> \nDestroying connection`
        );
        queue.delete(serverQueue.voiceChannel.guild.id);
        return;
    });
    serverQueue.textChannel.send(
        `Start playing: **${song.title}**<a:pepeJAM:852902332164603935>`
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

async function getVideoUrl(searchValue) {
    log("Searching for video url...");
    const { items } = await fetch(
        `https://www.googleapis.com/youtube/v3/search?q=${searchValue}&key=${googleApi}`
    ).then((respone) => respone.json());
    return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
}

function log(message) {
    if (!DEBUGGING) return;
    var toSave = `[${new Date().toLocaleString()}] ${message}`;
    console.log(toSave);
    try {
        fs.appendFile("./log/log.log", toSave + "\n", (err) => {
            if (err) log(`ERROR: currently inside callback: ${err}`);
        });
    } catch (error) {
        console.error(error);
        log("Error writing to log file");
    }
}
function alwaysLog(message) {
    var toSave = `[${new Date().toLocaleString()}] ${message}`;
    console.log(toSave);
    try {
        fs.appendFile("./log/log.log", toSave + "\n", (err) => {
            if (err) log(`ERROR: currently inside callback: ${err}`);
        });
    } catch (error) {
        console.error(error);
        log("Error writing to log file");
    }
}

client.login(token);

module.exports = { log, alwaysLog, DEBUGGING };
