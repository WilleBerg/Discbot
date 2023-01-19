const fetch = require("node-fetch");
const md5 = require("blueimp-md5");
const { apiKey, secret } = require("./config.json");
const fs = require("fs");

const LAST_FM_API_KEY = apiKey;
const LAST_FM_API_BASE = "http://ws.audioscrobbler.com/2.0/";
const DEBUGGING = true;

async function scrobbleSong(
    songName,
    artistName,
    album,
    timestamp,
    sessionKey
) {
    var auth_sig = `album${album}api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.scrobblesk${sessionKey}timestamp${timestamp}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    songName = encodeURIComponent(songName);
    album = encodeURIComponent(album);
    artistName = encodeURIComponent(artistName);
    try {
        const url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&timestamp=${timestamp}&format=json&api_sig=${auth_sig_md5Hex}`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from scrobbleSong: ${error}`);
        return "error";
    }
}

async function getRecentTracks(username, limit, page) {
    try {
        var url = `${LAST_FM_API_BASE}?method=user.getrecenttracks&user=${username}&api_key=${LAST_FM_API_KEY}&format=json&limit=${limit}&page=${page}`;
        return await fetch(url).then((response) => response.json());
    } catch (error) {
        log(`Error from getRecentTracks: ${error}`);
        return "error";
    }
}

async function updateNowPlaying(songName, artistName, album, sessionKey) {
    var auth_sig = `album${album}api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.updateNowPlayingsk${sessionKey}track${songName}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    songName = encodeURIComponent(songName);
    album = encodeURIComponent(album);
    artistName = encodeURIComponent(artistName);
    const url = `${LAST_FM_API_BASE}?method=track.updateNowPlaying&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&format=json&api_sig=${auth_sig_md5Hex}`;
    try {
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from updateNowPlaying: ${error}`);
        return "error";
    }
}

async function scrobbleSongs(songs, sessionKey) {
    var scrobbleList = [];
    for (let index = 0; index < songs.length; index++) {
        const song = songs[index];
        var scrobble = {
            artist: song.artist["#text"],
            track: song.name,
            album: song.album["#text"],
            timestamp: song.date.uts,
        };
        scrobbleList.push(scrobble);
    }
    // TEMP FIX
    for (let i = 0; i < scrobbleList.length; i++) {
        var result = await scrobbleSong(
            scrobbleList[i].track,
            scrobbleList[i].artist,
            scrobbleList[i].album,
            scrobbleList[i].timestamp,
            sessionKey
        );
        log(`Scrobble response: ${JSON.stringify(result)}`);
        if (result === "error") {
            log(
                `Error scrobbling song: ${scrobbleList[i].track} by ${scrobbleList[i].artist} on ${scrobbleList[i].album} at ${scrobbleList[i].timestamp}`
            );
        } else if (result.error === 9) {
            log(`Invalid session key`);
            return "invalidsession";
        } else if (
            result.scrobbles["@attr"] != null &&
            result.scrobbles["@attr"] != undefined &&
            result.scrobbles["@attr"]["ignored"] == 1
        ) {
            log(
                `Song ignored: ${scrobbleList[i].track} by ${scrobbleList[i].artist} on ${scrobbleList[i].album} at ${scrobbleList[i].timestamp}`
            );
            return "songsignored";
        }
    }
    return true;
    /*
    var auth_sig = `api_key${LAST_FM_API_KEY}methodtrack.scrobblesk${sessionKey}${JSON.stringify(scrobbleList)}${secret}`;
    var auth_sig_md5Hex = md5(auth_sig);
    try {
        const url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&format=json&api_sig=${auth_sig_md5Hex}`;
        const response = await fetch(url, {'method': 'POST', 'body': JSON.stringify(scrobbleList)});
        const data = await response.json();
        log(`Scrobble response: ${JSON.stringify(data)}`);
        return true;
    } catch (error) {
        log(`Error from scrobbleSongs: ${error}`);
        return 'error';
    }
    */
}

function log(message) {
    if (!DEBUGGING) return;
    var toSave = `[${new Date().toLocaleString()}] ${message}`;
    console.log(toSave);
    try {
        fs.appendFile("./log/lastfmLog.log", toSave + "\n", (err) => {
            if (err) log(`ERROR: currently inside callback: ${err}`);
        });
    } catch (error) {
        console.error(error);
        log("Error writing to log file");
    }
}
// why did i do this
function convertErrorCode(errorCode) {
    switch (errorCode) {
        case 2:
            return "Invalid service - This service does not exist";
        case 3:
            return "Invalid Method - No method with that name in this package";
        case 4:
            return "Authentication Failed - You do not have permissions to access the service";
        case 5:
            return "Invalid format - This service doesn't exist in that format";
        case 6:
            return "Invalid parameters - Your request is missing a required parameter";
        case 7:
            return "Invalid resource specified";
        case 8:
            return "Operation failed - Something else went wrong";
        case 9:
            return "Invalid session key - Please re-authenticate";
        case 10:
            return "Invalid API key - You must be granted a valid key by last.fm";
        case 11:
            return "Service Offline - This service is temporarily offline. Try again later.";
        case 12:
            return "Subscribers Only - This station is only available to paid last.fm subscribers";
        case 13:
            return "Invalid method signature supplied";
        case 14:
            return "Unauthorized Token - This token has not been authorized";
        case 15:
            return "This item is not available for streaming";
        case 16:
            return "The service is temporarily unavailable, please try again";
        case 17:
            return "Login: User requires to be logged in";
        case 18:
            return "Trial Expired - This user has no free radio plays left. Subscription required.";
        case 19:
            return "This error does not exist";
        case 20:
            return "Not Enough Content - There is not enough content to play this station";
        case 21:
            return "Not Enough Members - This group does not have enough members for radio";
        case 22:
            return "Not Enough Fans - This artist does not have enough fans for for radio";
        case 23:
            return "Not Enough Neighbours - There are not enough neighbours for radio";
        case 24:
            return "No Peak Radio - This user is not allowed to listen to radio during peak usage";
        case 25:
            return "Radio Not Found - Radio station not found";
        case 26:
            return "API Key Suspended - This application is not allowed to make requests to the web services";
        case 27:
            return "Deprecated - This type of request is no longer supported";
        case 29:
            return "Rate Limit Exceeded - Your IP has made too many requests in a short period";
        default:
            return "Unknown error";
    }
}
module.exports = {
    scrobbleSong,
    getRecentTracks,
    updateNowPlaying,
    scrobbleSongs,
};
