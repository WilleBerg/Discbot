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
    log(`\n\n\n\n\n`);
    log("scrobbleSong called");
    log(`\n\n\n\n\n`);

    var auth_sig = `album${album}api_key${LAST_FM_API_KEY}artist${artistName}methodtrack.scrobblesk${sessionKey}timestamp${timestamp}track${songName}${secret}`;
    log(auth_sig);
    var auth_sig_md5Hex = md5(auth_sig);
    songName = encodeURIComponent(songName);
    album = encodeURIComponent(album);
    artistName = encodeURIComponent(artistName);
    try {
        const url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistName}&track=${songName}&album=${album}&timestamp=${timestamp}&format=json&api_sig=${auth_sig_md5Hex}`;
        log(url);
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from scrobbleSong: ${error}`);
        return "error";
    }
}

async function scrobbleSongs(
    songNames,
    artistNames,
    albums,
    timestamps,
    sessionKey
) {
    log(`\n\n\n\n\n`);
    log("scrobbleSongs called");
    log(`songNames: ${songNames}`);
    log(`artistNames: ${artistNames}`);
    log(`albums: ${albums}`);
    log(`timestamps: ${timestamps}`);
    log(`sessionKey: ${sessionKey}`);
    log(`\n\n\n\n\n`);
    var auth_sig = "album[";
    for (var i = 0; i < albums.length; i++) {
        auth_sig += albums[i];
        if (i != albums.length - 1) auth_sig += ",";
        else auth_sig += "]";
    }
    auth_sig += `api_key${LAST_FM_API_KEY}`;
    auth_sig += "artist[";
    for (var i = 0; i < artistNames.length; i++) {
        auth_sig += artistNames[i];
        if (i != artistNames.length - 1) auth_sig += ",";
        else auth_sig += "]";
    }
    auth_sig += `methodtrack.scrobblesk${sessionKey}`;
    auth_sig += "timestamp[";
    for (var i = 0; i < timestamps.length; i++) {
        auth_sig += timestamps[i];
        if (i != timestamps.length - 1) auth_sig += ",";
        else auth_sig += "]";
    }
    auth_sig += "track[";
    for (var i = 0; i < songNames.length; i++) {
        auth_sig += songNames[i];
        if (i != songNames.length - 1 ) auth_sig += ",";
        else auth_sig += "]";
    }
    // add secret to end
    auth_sig += secret;
    log(auth_sig);
    //auth_sig = encodeURI(auth_sig);
    var auth_sig_md5Hex = md5(auth_sig);
    log(auth_sig_md5Hex);
    try {
        var url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=[${artistNames}]&track=[${songNames}]&album=[${albums}]&timestamp=[${timestamps}]&format=json&api_sig=${auth_sig_md5Hex}`;
        //url = encodeURI(url);
        log(url);
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        return data;
    } catch (error) {
        log(`Error from scrobbleSongs: ${error}`);
        return "error";
    }
}
async function testScrobbles(
    songNames,
    artistNames,
    albums,
    timestamps,
    sessionKey,
    isReverse,
    hasBracketsInMD5,
    hasBracketsInLink,
    ismd5Encoded,
    isUrlEncoded
) {
    var msg = "";
    msg += (`\n\n\n\n\n`);
    msg += ("testScrobbles called\n");
    msg += (`songNames: ${songNames}\n`);
    msg += (`artistNames: ${artistNames}\n`);
    msg += (`albums: ${albums}\n`);
    msg += (`timestamps: ${timestamps}\n`);
    msg += (`sessionKey: ${sessionKey}\n`);
    msg += (`isReverse: ${isReverse} , hasBracketsInMD5: ${hasBracketsInMD5} , hasBracketsInLink: ${hasBracketsInLink} , ismd5Encoded: ${ismd5Encoded} , isUrlEncoded: ${isUrlEncoded}\n`);
    if (hasBracketsInMD5) var auth_sig = "album[";
    else var auth_sig = "album";
    if (isReverse) {
        for (var i = albums.length - 1; i >= 0; i--) {
            auth_sig += albums[i];
            if (i != 0 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    } else {
        for (var i = 0; i < albums.length; i++) {
            auth_sig += albums[i];
            if (i != albums.length - 1 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    auth_sig += `api_key${LAST_FM_API_KEY}`;
    if (hasBracketsInMD5) auth_sig += "artist[";
    else auth_sig += "artist";
    if (isReverse) {
        for (var i = artistNames.length - 1; i >= 0; i--) {
            auth_sig += artistNames[i];
            if (i != 0 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    else {
        for (var i = 0; i < artistNames.length; i++) {
            auth_sig += artistNames[i];
            if (i != artistNames.length - 1 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    auth_sig += `methodtrack.scrobblesk${sessionKey}`;
    if (hasBracketsInMD5) auth_sig += "timestamp[";
    else auth_sig += "timestamp";
    if (isReverse) {
        for (var i = timestamps.length - 1; i >= 0; i--) {
            auth_sig += timestamps[i];
            if (i != 0 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    else {
        for (var i = 0; i < timestamps.length; i++) {
            auth_sig += timestamps[i];
            if (i != timestamps.length - 1 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    if (hasBracketsInMD5) auth_sig += "track[";
    else auth_sig += "track";
    if (isReverse) {
        for (var i = songNames.length - 1; i >= 0; i--) {
            auth_sig += songNames[i];
            if (i != 0 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    else {
        for (var i = 0; i < songNames.length; i++) {
            auth_sig += songNames[i];
            if (i != songNames.length - 1 && hasBracketsInMD5) auth_sig += ",";
            else if(hasBracketsInMD5) auth_sig += "]";
        }
    }
    auth_sig += secret;
    msg += (`auth_sig: ${auth_sig}\n`);
    if (ismd5Encoded) auth_sig = encodeURI(auth_sig);
    var auth_sig_md5Hex = md5(auth_sig);
    msg += (`auth_sig_md5Hex: ${auth_sig_md5Hex}\n`);
    try{
        if (hasBracketsInLink) {
            var url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=[${artistNames}]&track=[${songNames}]&album=[${albums}]&timestamp=[${timestamps}]&format=json&api_sig=${auth_sig_md5Hex}`;
        } else {
            var url = `${LAST_FM_API_BASE}?method=track.scrobble&api_key=${LAST_FM_API_KEY}&sk=${sessionKey}&artist=${artistNames}&track=${songNames}&album=${albums}&timestamp=${timestamps}&format=json&api_sig=${auth_sig_md5Hex}`;
        }
        if (isUrlEncoded) url = encodeURI(url);
        msg += (`url: ${url}\n`);
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        if (data["error"] != undefined && data.error == 13) {
            return 0;
        } else {
            log(msg)
            return data;
        }
    } catch (error) {
        log(`Error from testScrobbles: ${error}`);
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
    testScrobbles,
};
