const {
    getRecentTracks,
    scrobbleSong,
    updateNowPlaying,
    scrobbleSongs,
} = require("./lastfm.js");

const {
    getSessionKey
} = require("./userHandler.js");

const {
    log,
    alwaysLog
} = require("./logger.js");

const {
    MessageEmbed
} = require("discord.js");

const SCROBBLER_TIMEOUT = 1000 * 60 * 60 * 5;

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
                "You need to enter a valid command! " +
                "The user you entered does not have any recent tracks!"
            );
            return;
        }
        tracks = recentTracks.recenttracks.track;
        mostRecentTrack = tracks[0];
    } catch (error) {
        message.channel.send(
            "You need to enter a valid command! " +
            "The user you entered does not have any recent tracks!"
        );
        return;
    }
    var start = 0;
    var isPlaying =
        mostRecentTrack["@attr"] != null &&
        mostRecentTrack["@attr"]["nowplaying"] == "true";
    log(JSON.stringify(tracks[0]));
    if (isPlaying) {
        log("User is playing a song!");
        start += 1;
        amount++;
        // Since the most recent track is not playing, we need to start 
        // at the second most recent track.
        // However end should still be the same if end == 50
        //end += 1;
        // TODO: redo this so that there only 1 loop (number = i or i+1)
        em = [];
        for (var i = start; i < amount; i++) {
            var date = new Date(tracks[i].date.uts * 1000);

            const newEmbed = new MessageEmbed()
                .setColor(0x0099ff)
                .setAuthor({
                    name:
                        i +
                        ". " +
                        tracks[i].artist["#text"] +
                        " - " +
                        tracks[i].name,
                    iconURL: tracks[i].image[0]["#text"],
                })
                .setFooter({ text: " at " + date.toLocaleString() });
            em.push(newEmbed);
            if (em.length == 10) {
                await message.channel.send({ embeds: em });
                em = [];
            }
        }
        if (em.length > 0) {
            await message.channel.send({ embeds: em });
        }
        return;
    }
    em = [];
    for (var i = 0; i < amount; i++) {
        var date = new Date(tracks[i].date.uts * 1000);
        const newEmbed = new MessageEmbed()
            .setColor(0x0099ff)
            .setAuthor({
                name:
                    i +
                    1 +
                    ". " +
                    tracks[i].artist["#text"] +
                    " - " +
                    tracks[i].name,
                iconURL: tracks[i].image[0]["#text"],
            })
            .setFooter({ text: " at " + date.toLocaleString() });
        em.push(newEmbed);
        if (em.length == 10) {
            await message.channel.send({ embeds: em });
            em = [];
        }
    }
    if (em.length > 0) {
        await message.channel.send({ embeds: em });
    }
    return;
}

async function multiScrobbler(message) {
    var mess = message.content.split(" ");
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
            log("Song range: " + songRange);
            songRanges.push(songRange);
        }
    } catch {
        message.channel.send(
            "You need to enter a valid command! " +
            "Something is wrong with your song ranges!"
        );
        return;
    }
    var recentTracks;
    var mostRecentTrack;
    var tracks;
    try {
        recentTracks = await getRecentTracks(user, 200, 1);
        if (recentTracks == null || recentTracks == undefined) {
            message.channel.send(
                "You need to enter a valid command!" +
                "The user you entered does not have any recent tracks!"
            );
            return;
        }
        tracks = recentTracks.recenttracks.track;
        mostRecentTrack = tracks[0];
    } catch (error) {
        message.channel.send(
            "You need to enter a valid command! " + 
            "The user you entered does not have any recent tracks!"
        );
        return;
    }
    log("Song ranges: " + songRanges);
    var scrobbleList = [];
    var set = new Set();
    for (var i = 0; i < songRanges.length; i++) {
        var start = parseInt(songRanges[i][0]);
        var end = parseInt(songRanges[i][1]);
        log("Start: " + start + " End: " + end);
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
                "You need to enter a valid command! " +  
                "The user you entered does not have that many recent tracks!"
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
            "You do not have a valid session key! " + 
            "Please redo the lastFM setup process!"
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
    for (var i = 0; i < results.length; i++) {
        if (results[i] == "error") {
            message.channel.send(
                "Something went wrong while scrobbling the songs!"
            );
            return;
        } else if (results[i] == "invalidsession") {
            message.channel.send(
                "Your session key is invalid! " +
                "Please redo the lastFM setup process!"
            );
            return;
        }
    }
    em = [];
    tracks = scrobbleList;
    await message.channel.send("Scrobbled songs:");
    for (var i = 0; i < scrobbleList.length; i++) {
        var date = new Date(tracks[i].date.uts * 1000);
        const newEmbed = new MessageEmbed()
            .setColor(0x0099ff)
            .setAuthor({
                name:
                    i +
                    1 +
                    ". " +
                    tracks[i].artist["#text"] +
                    " - " +
                    tracks[i].name,
                iconURL: tracks[i].image[0]["#text"],
            })
            .setFooter({ text: " at " + date.toLocaleString() });
        em.push(newEmbed);
        if (em.length == 10) {
            await message.channel.send({ embeds: em });
            em = [];
        }
    }
    if (em.length > 0) {
        await message.channel.send({ embeds: em });
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
                `Error getting recent tracks for ${userToListen}, ` + 
                `check lastfmLog.log for more info`
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
                        "Your session key is invalid, " +
                        "please re-register your LastFM account with the bot"
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
        `Will try to scrobble ${userToListen}'s songs for ` + 
        `${message.author.username}`
    );
    var newScrobbler = {
        user: message.author,
        userToListen: userToListen,
        lastScrobbledTrack: null,
        sessionKey: await getSessionKey(message.author),
        isFirstScrobble: true,
        _id: message.author.id,
        remove: false,
        timeout: SCROBBLER_TIMEOUT,
    };
    scrobblers.push(newScrobbler);
    timer = 0;
    await message.channel.send(
        `Will try to scrobble ${userToListen}'s songs for ` + 
        `${message.author.username}`
    );
}

module.exports({
    duoscrobble,
    stopscrobbling,
    multiScrobbler,
    latestScrobbles,
    updateScrobblers
});
